// Synchronise CERtain avec Moodle.
// - Détecte les devoirs « CER » à rendre dans les cours « Prosit N - Notion » de chaque étudiant relié.
// - Crée le prosit (énoncé, objectifs et ressources importés) ou rejoint celui d'un camarade du même groupe.
// - Lance la rédaction 30 h avant l'échéance si l'énoncé est là.
// Appel : pg_cron (x-cron-secret, tous les étudiants en mode auto) ou un étudiant connecté (lui seul).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MOODLE = "https://moodle.icam-afrique.com";
const HORIZON_J = 21;        // devoirs dont l'échéance tombe dans les 21 prochains jours
const RATTRAPAGE_J = 14;    // CER en retard repris s'ils peuvent encore être déposés
const LANCEMENT_H = 30;      // rédaction lancée 30 h avant l'échéance
const MAX_RESSOURCE = 10e6;  // 10 Mo par ressource, 3 ressources au plus
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

type Devoir = { id: number; cmid: number; name: string; duedate: number };
type Cours = { id: number; shortname: string; fullname: string; assignments: Devoir[] };

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

const texte = (h: string) => h
  .replace(/<\s*(br|\/p|\/li|\/h\d|\/tr)\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "- ")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim();

function anneeAcad(d: Date) {
  const debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${debut}/${debut + 1}`;
}

// deno-lint-ignore no-explicit-any
async function importer(admin: any, jeton: string, prositId: string, courseId: number) {
  const sections = await ws(jeton, "core_course_get_contents", { courseid: String(courseId) });
  const parties: string[] = [];
  let ressources = 0;
  for (const s of sections) {
    for (const m of s.modules ?? []) {
      if (m.modname === "label" && m.description) {
        parties.push(`## ${s.name || m.name}\n\n${texte(m.description)}`);
      }
      if (m.modname === "resource" && ressources < 3) {
        const f = (m.contents ?? []).find((c: { type: string }) => c.type === "file");
        if (!f || f.filesize > MAX_RESSOURCE) continue;
        const url = f.fileurl + (f.fileurl.includes("?") ? "&" : "?") + "token=" + jeton;
        const bin = await fetch(url).then((r) => r.ok ? r.arrayBuffer() : null).catch(() => null);
        if (!bin) continue;
        const nom = "ressource_" + f.filename.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_");
        await admin.storage.from("prosits").upload(`${prositId}/${nom}`, bin, { contentType: f.mimetype, upsert: true });
        ressources++;
      }
    }
  }
  if (parties.length) {
    await admin.storage.from("prosits").upload(`${prositId}/enonce.txt`,
      new Blob([parties.join("\n\n")], { type: "text/plain; charset=utf-8" }), { upsert: true });
  }
  return { enonce: parties.length > 0, ressources };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const rep = (s: number, c: unknown) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

  // Qui demande ?
  let cible: string | null = null;
  const { data: cronOk } = await admin.rpc("serveur_verifier_cron", { p_secret: req.headers.get("x-cron-secret") ?? "" });
  if (cronOk !== true) {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return rep(401, { erreur: "Connecte-toi d'abord." });
    cible = user.id;
  }

  let q = admin.from("etudiants").select("id, groupe, auto").eq("moodle_relie", true).eq("actif", true);
  q = cible ? q.eq("id", cible) : q.eq("auto", true);
  const { data: etudiants } = await q;

  const maintenant = Date.now() / 1000;
  const resultat: Record<string, unknown>[] = [];

  for (const e of etudiants ?? []) {
    const { data: jeton } = await admin.rpc("serveur_lire_jeton", { p_etudiant: e.id });
    if (!jeton) continue;
    let cours: Cours[] = [];
    try { cours = (await ws(jeton, "mod_assign_get_assignments")).courses ?? []; }
    catch (err) { resultat.push({ etudiant: e.id, erreur: String(err) }); continue; }

    for (const c of cours) {
      // « Prosit 3 - Notion », « PROSIT 3 : Notion », « PR-4 Notion », code « GLOG461-P3 » ou « prosit4 »
      const m = c.fullname.match(/pros?it\s*0*(\d+)\s*[-–:]\s*(.+)$/i)
        ?? c.fullname.match(/^\s*pr\s*-?\s*0*(\d+)\s*[-–:]?\s*(.+)$/i)
        ?? c.shortname.match(/(?:-P|prosit\s*-?|^pr\s*-?)0*(\d+)\s*$/i);
      if (!m) continue;
      for (const d of c.assignments) {
        if (!/cer|d[ée]p[oô]t/i.test(d.name)) continue;
        if (/\(\s*kin\s*\)|\bkin\b/i.test(d.name)) continue;            // dépôt d'un autre campus
        // deno-lint-ignore no-explicit-any
        const dd = d as any;
        if (dd.cutoffdate && dd.cutoffdate < maintenant) continue;         // devoir fermé
        // À venir (21 j) ou en retard de moins de 14 j sur un devoir encore ouvert : on rattrape
        if (!d.duedate || d.duedate < maintenant - RATTRAPAGE_J * 86400 || d.duedate > maintenant + HORIZON_J * 86400) continue;

        // Supprimé par l'étudiant : ne jamais le recréer
        const { data: ignore } = await admin.from("depots_ignores").select("cmid").eq("etudiant_id", e.id).eq("cmid", d.cmid);
        if (ignore?.length) continue;

        // Déjà suivi par cet étudiant ?
        const { data: deja } = await admin.from("prosit_membres").select("prosit_id, prosits!inner(cmid)")
          .eq("etudiant_id", e.id).eq("prosits.cmid", d.cmid);
        if (deja?.length) continue;

        // Déjà rendu sur Moodle ?
        const st = await ws(jeton, "mod_assign_get_submission_status", { assignid: String(d.id) }).catch(() => null);
        if (st?.lastattempt?.submission?.status === "submitted") continue;

        // Un camarade du même groupe suit déjà ce devoir → on le rejoint
        const groupe = (e.groupe ?? "").trim();
        if (groupe) {
          const { data: ami } = await admin.from("prosits").select("id").eq("cmid", d.cmid).ilike("groupe", groupe)
            .not("statut", "in", "(depose)").limit(1);
          if (ami?.length) {
            await admin.from("prosit_membres").upsert({ prosit_id: ami[0].id, etudiant_id: e.id, invitation: "accepte" });
            resultat.push({ etudiant: e.id, cmid: d.cmid, action: "rejoint" });
            continue;
          }
        }

        const notion = (m[2] ?? c.fullname).trim();
        const { data: p, error } = await admin.from("prosits").insert({
          createur_id: e.id, numero: Number(m[1]), notion, cours: c.shortname.replace(/-P\d+$/i, ""),
          cmid: d.cmid, course_id: c.id, groupe, annee: anneeAcad(new Date(d.duedate * 1000)),
          echeance: new Date(d.duedate * 1000).toISOString(), source: "moodle",
        }).select("id").single();
        if (error || !p) { resultat.push({ etudiant: e.id, cmid: d.cmid, erreur: error?.message }); continue; }
        const imp = await importer(admin, jeton, p.id, c.id).catch((err) => ({ erreur: String(err) }));
        resultat.push({ etudiant: e.id, cmid: d.cmid, action: "cree", ...imp });
      }
    }
  }

  // Lancement automatique de la rédaction à l'approche de l'échéance
  const seuil = new Date(Date.now() + LANCEMENT_H * 3600_000).toISOString();
  const { data: aLancer } = await admin.from("prosits").select("id").eq("statut", "brouillon").lte("echeance", seuil);
  let lances = 0;
  for (const p of aLancer ?? []) {
    const { data: fichiers } = await admin.storage.from("prosits").list(p.id);
    if ((fichiers ?? []).some((f: { name: string }) => f.name.startsWith("enonce."))) {
      await admin.from("prosits").update({ statut: "en_attente" }).eq("id", p.id); lances++;
    }
  }
  return rep(200, { etudiants: etudiants?.length ?? 0, actions: resultat, lances });
});
