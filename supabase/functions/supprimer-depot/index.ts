// Supprime un dépôt planifié (ou déjà fait) pour l'étudiant connecté.
// - Le retire de CERtain (il quitte le prosit ; le prosit disparaît s'il était seul).
// - Note le devoir comme « ignoré » pour que la synchronisation ne le recrée pas.
// - Option : vide aussi sa remise sur Moodle (si le devoir est encore modifiable).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MOODLE = "https://moodle.icam-afrique.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

async function ws(jeton: string, fonction: string, args: Record<string, string> = {}) {
  const r = await fetch(`${MOODLE}/webservice/rest/server.php`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ wstoken: jeton, wsfunction: fonction, moodlewsrestformat: "json", ...args }),
  });
  const j = await r.json();
  if (j && j.exception) throw new Error(`${j.errorcode}: ${j.message}`);
  return j;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const rep = (s: number, c: unknown) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return rep(401, { erreur: "Connecte-toi d'abord." });
  const { prosit, retirer_moodle } = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/.test(String(prosit ?? ""))) return rep(400, { erreur: "Prosit manquant." });

  const { data: moi } = await admin.from("etudiants").select("actif").eq("id", user.id).single();
  if (!moi?.actif) return rep(403, { erreur: "Ton accès à CERtain a été retiré." });
  const { data: p } = await admin.from("prosits").select("id, cmid, createur_id").eq("id", prosit).single();
  const { data: m } = await admin.from("prosit_membres").select("depose_le").eq("prosit_id", prosit).eq("etudiant_id", user.id).single();
  if (!p || !m) return rep(404, { erreur: "Ce dépôt n'existe pas ou ne te concerne pas." });

  // 1. Vider la remise Moodle si demandé
  let moodle = "non demandé";
  if (retirer_moodle && m.depose_le && p.cmid) {
    const { data: jeton } = await admin.rpc("serveur_lire_jeton", { p_etudiant: user.id });
    if (!jeton) moodle = "Moodle non relié : remise laissée telle quelle";
    else try {
      const devoir = (await ws(jeton, "mod_assign_get_assignments")).courses
        ?.flatMap((c: { assignments: { cmid: number }[] }) => c.assignments).find((d: { cmid: number }) => d.cmid === p.cmid);
      const st = devoir && await ws(jeton, "mod_assign_get_submission_status", { assignid: String(devoir.id) });
      if (!devoir || !st?.lastattempt?.canedit) moodle = "Devoir fermé ou verrouillé : la remise ne peut plus être modifiée";
      else {
        const { itemid } = await ws(jeton, "core_files_get_unused_draft_itemid");
        await ws(jeton, "mod_assign_save_submission", { assignmentid: String(devoir.id), "plugindata[files_filemanager]": String(itemid) });
        moodle = "Remise vidée sur Moodle";
      }
    } catch (e) { moodle = `Échec sur Moodle : ${String((e as Error).message).slice(0, 120)}`; }
  }

  // 2. Ne plus jamais recréer ce dépôt automatiquement
  if (p.cmid) await admin.from("depots_ignores").upsert({ etudiant_id: user.id, cmid: p.cmid });

  // 3. Quitter le prosit ; le supprimer s'il ne reste personne
  await admin.from("prosit_membres").delete().eq("prosit_id", prosit).eq("etudiant_id", user.id);
  const { data: restants } = await admin.from("prosit_membres").select("etudiant_id, invitation").eq("prosit_id", prosit);
  const actifs = (restants ?? []).filter((r: { invitation: string }) => r.invitation === "accepte");
  if (!actifs.length) {
    const { data: fichiers } = await admin.storage.from("prosits").list(prosit, { limit: 1000 });
    if (fichiers?.length) await admin.storage.from("prosits").remove(fichiers.map((f: { name: string }) => `${prosit}/${f.name}`));
    await admin.from("prosits").delete().eq("id", prosit);
  } else if (p.createur_id === user.id) {
    await admin.from("prosits").update({ createur_id: actifs[0].etudiant_id }).eq("id", prosit);
  }
  return rep(200, { ok: true, moodle, prosit_supprime: !actifs.length });
});
