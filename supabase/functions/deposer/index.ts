// Dépose sur Moodle les CER prêts dont l'échéance approche.
// Appelée chaque heure par pg_cron (en-tête x-cron-secret), jamais par un navigateur.
// Règles : jamais de dépôt pour un membre qui a annulé ; une seule tentative par membre et par passage ;
// un jeton refusé par Moodle est noté et le membre n'est plus retenté avant qu'il relie à nouveau son compte.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MOODLE = "https://moodle.icam-afrique.com";
const AVANCE_H = 3; // dépôt à partir de 3 h avant l'échéance

async function ws(jeton: string, fonction: string, args: Record<string, string> = {}) {
  const r = await fetch(`${MOODLE}/webservice/rest/server.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ wstoken: jeton, wsfunction: fonction, moodlewsrestformat: "json", ...args }),
  });
  const j = await r.json();
  if (j && j.exception) throw new Error(`${j.errorcode}: ${j.message}`);
  return j;
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ok } = await admin.rpc("serveur_verifier_cron", { p_secret: req.headers.get("x-cron-secret") ?? "" });
  if (ok !== true) return new Response("Interdit", { status: 403 });

  const limite = new Date(Date.now() + AVANCE_H * 3600_000).toISOString();
  const { data: prosits } = await admin.from("prosits").select("id, cmid, echeance")
    .eq("statut", "pret").not("cmid", "is", null).lte("echeance", limite);

  const journal: string[] = [];
  for (const p of prosits ?? []) {
    const { data: membres } = await admin.from("prosit_membres").select("*")
      .eq("prosit_id", p.id).eq("invitation", "accepte");
    for (const m of membres ?? []) {
      if (m.annule || m.depose_le || !m.fichier) continue;
      if (m.depot_statut?.startsWith("jeton refusé")) continue;
      const maj = (champs: Record<string, unknown>) =>
        admin.from("prosit_membres").update(champs).eq("prosit_id", p.id).eq("etudiant_id", m.etudiant_id);

      const { data: jeton } = await admin.rpc("serveur_lire_jeton", { p_etudiant: m.etudiant_id });
      if (!jeton) { await maj({ depot_statut: "Moodle non relié" }); continue; }
      try {
        const devoirs = await ws(jeton, "mod_assign_get_assignments");
        const devoir = devoirs.courses?.flatMap((c: { assignments: { cmid: number }[] }) => c.assignments)
          .find((d: { cmid: number }) => d.cmid === p.cmid);
        if (!devoir) { await maj({ depot_statut: "Devoir introuvable dans ses cours" }); continue; }

        const { data: blob, error } = await admin.storage.from("prosits").download(m.fichier);
        if (error || !blob) { await maj({ depot_statut: "Fichier CER introuvable" }); continue; }
        const nom = m.fichier.split("/").pop()!;
        const form = new FormData();
        form.append("token", jeton); form.append("filearea", "draft"); form.append("itemid", "0");
        form.append("file_1", new File([blob], nom, {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
        const up = await fetch(`${MOODLE}/webservice/upload.php`, { method: "POST", body: form }).then((r) => r.json());
        const itemid = Array.isArray(up) ? up[0]?.itemid : undefined;
        if (!itemid) throw new Error(up?.errorcode ?? "téléversement refusé");

        await ws(jeton, "mod_assign_save_submission", {
          assignmentid: String(devoir.id), "plugindata[files_filemanager]": String(itemid) });
        if (devoir.submissiondrafts) {
          await ws(jeton, "mod_assign_submit_for_grading", {
            assignmentid: String(devoir.id), ...(devoir.requiresubmissionstatement ? { acceptsubmissionstatement: "1" } : {}) });
        }
        await maj({ depose_le: new Date().toISOString(), depot_statut: "Déposé" });
        journal.push(`${p.id}/${m.etudiant_id}: déposé`);
      } catch (e) {
        const msg = String((e as Error).message);
        const refuse = /invalidtoken|accessexception/i.test(msg);
        await maj({ depot_statut: refuse ? "jeton refusé : relier Moodle à nouveau" : `Échec : ${msg.slice(0, 120)}` });
        if (refuse) await admin.rpc("serveur_noter_echec", { p_etudiant: m.etudiant_id });
        journal.push(`${p.id}/${m.etudiant_id}: ${msg}`);
      }
    }
    // Prosit terminé quand tous les membres actifs sont déposés
    const { data: restants } = await admin.from("prosit_membres").select("etudiant_id")
      .eq("prosit_id", p.id).eq("invitation", "accepte").eq("annule", false).is("depose_le", null);
    if ((restants ?? []).length === 0) await admin.from("prosits").update({ statut: "depose" }).eq("id", p.id);
  }
  return new Response(JSON.stringify({ traites: prosits?.length ?? 0, journal }), {
    headers: { "Content-Type": "application/json" } });
});
