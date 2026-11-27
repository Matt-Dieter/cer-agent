// Synchronise CERtain avec Moodle.
// - Détecte les devoirs CER à rendre dans les cours de prosit de chaque étudiant relié (détection souple).
// - Crée le prosit de l'étudiant (énoncé et ressources importés). Chaque étudiant a son propre prosit ;
//   la session de rédaction regroupe ceux d'un même devoir (fond commun, une version par étudiant).
// - Lance la rédaction 30 h avant l'échéance si l'énoncé est là.
// Appel : pg_cron toutes les 10 min (x-cron-secret, par lots) ou un étudiant connecté (lui seul).
// Cron avec { etudiant: id } : synchro immédiate de cet étudiant. Avec { diagnostic: true, etudiant: id } : rien n'est créé,
// chaque devoir vu est renvoyé avec la raison du choix.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MOODLE = "https://moodle.icam-afrique.com";
const HORIZON_J = 21;        // devoirs dont l'échéance tombe dans les 21 prochains jours
const RATTRAPAGE_J = 14;     // CER en retard repris s'ils peuvent encore être déposés
const LANCEMENT_H = 30;      // rédaction lancée 30 h avant l'échéance
const MAX_RESSOURCE = 10e6;  // 10 Mo par ressource, 3 ressources au plus
const LOT = 8;               // étudiants traités par passage

// ── Détection souple des CER ─────────────────────────────────────────────────────────────────────
const FORT = /\b(cers?|compte[\s-]?rendus?|pros?its?)\b/i;
const FAIBLE = /d[ée]p[oô]t|rendu/i;
const EXCLU = /\b(projet|livrable|rapport|pitch|check|quiz|stage|soutenance|lab|vision|pr[ée]sentation)\b/i;
const COURS_PROSIT = /pros?its?\b|\bpr\s*-?\s*\d|\bpro\s*-?\s*\d|-p0*\d+\s*$|\bp0*\d+\s*$/i;
const NUM = [/\bcours\s*0*(\d{1,2})\b/i, /pros?its?\s*(?:n[°o]?\s*)?0*(\d{1,2})\b/i, /\bpro?\s*-?\s*0*(\d{1,2})\b/i, /-p0*(\d{1,2})\b/i, /\bp0*(\d{1,2})\s*$/i];
function estUnCer(c: { fullname: string; shortname: string }, d: { name: string }) {
  const coursProsit = COURS_PROSIT.test(c.fullname + " " + c.shortname);
  const fort = FORT.test(d.name) && !(EXCLU.test(d.name) && !/\bpros?its?\b/i.test(d.name));
  const faible = coursProsit && FAIBLE.test(d.name) && !EXCLU.test(d.name);
  return fort || faible;
}
function numeroDe(c: { fullname: string; shortname: string }, d: { name: string }) {
  for (const t of [c.fullname, d.name, c.shortname]) for (const r of NUM) { const m = t.match(r); if (m) return Number(m[1]); }
  return 0;
}
function notionDe(c: { fullname: string }) {
  const m = c.fullname.match(/pros?its?\s*(?:n[°o]?\s*)?\d+\s*[-–:]?\s*(.+)$/i);
  return (m ? m[1] : c.fullname.replace(/^\s*pro?\s*-?\s*\d+\s*[-–:]?\s*/i, "")).replace(/&amp;/g, "&").trim();
}
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

// Année académique : d'août à juillet (novembre 2026 → 2026/2027)
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

  let cible: string | null = null;
  const corps = await req.json().catch(() => ({}));
  const { data: cronOk } = await admin.rpc("serveur_verifier_cron", { p_secret: req.headers.get("x-cron-secret") ?? "" });
  const diag = cronOk === true && corps?.diagnostic === true && typeof corps.etudiant === "string";
  const force = cronOk === true && !diag && typeof corps?.etudiant === "string";
  if (cronOk !== true) {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return rep(401, { erreur: "Connecte-toi d'abord." });
    cible = user.id;
  }

  // Par lots : à chaque passage, les étudiants synchronisés il y a le plus longtemps d'abord.
  let q = admin.from("etudiants").select("id, groupe, auto, promotion").eq("moodle_relie", true).eq("actif", true);
  if (diag || force) q = q.eq("id", corps.etudiant);
  else if (cible) q = q.eq("id", cible);
  else q = q.eq("auto", true).or(`sync_le.is.null,sync_le.lt.${new Date(Date.now() - 50 * 60_000).toISOString()}`)
    .order("sync_le", { ascending: true, nullsFirst: true }).limit(LOT);
  const { data: etudiants } = await q;

  const maintenant = Date.now() / 1000;
  const resultat: Record<string, unknown>[] = [];
  const vus: Record<string, unknown>[] = [];

  for (const e of etudiants ?? []) {
    const { data: jeton } = await admin.rpc("serveur_lire_jeton", { p_etudiant: e.id });
    if (!jeton) continue;
    let cours: Cours[] = [];
    try { cours = (await ws(jeton, "mod_assign_get_assignments")).courses ?? []; }
    catch (err) { resultat.push({ etudiant: e.id, erreur: String(err) }); continue; }
    // Dernier accès de l'étudiant à chaque cours : reconnaît les cours en cours dont le devoir garde les dates de l'an dernier
    const acces = new Map<number, number>();
    try {
      const info = await ws(jeton, "core_webservice_get_site_info");
      for (const ec of await ws(jeton, "core_enrol_get_users_courses", { userid: String(info.userid) })) acces.set(ec.id, ec.lastaccess ?? 0);
    } catch { /* sans cette information, pas de rattrapage des dates périmées */ }

    for (const c of cours) {
      for (const d of c.assignments) {
        const note = (raison: string) => { if (diag) vus.push({ cours: c.fullname, devoir: d.name, echeance: d.duedate ? new Date(d.duedate * 1000).toISOString() : null, raison }); };
        if (!estUnCer(c, d)) continue;
        // Variantes « (Kin) » d'un autre campus : jamais déposées ici
        if (/\(\s*kin\s*\)|\bkin\b/i.test(d.name)) { note("variante Kin"); continue; }
        // deno-lint-ignore no-explicit-any
        const dd = d as any;
        if (dd.cutoffdate && dd.cutoffdate < maintenant) { note("devoir fermé (cutoff " + new Date(dd.cutoffdate * 1000).toISOString() + ")"); continue; }

        // Devoir réutilisé d'une année sur l'autre sans mise à jour des dates (fréquent en 2e année) : s'il est encore ouvert
        // et que l'étudiant a ouvert le cours ces 14 derniers jours, l'échéance est ramenée à l'année en cours.
        let echeance = d.duedate;
        let estimee = false;
        if (echeance && echeance < maintenant - RATTRAPAGE_J * 86400 && (acces.get(c.id) ?? 0) > maintenant - 14 * 86400) {
          const x = new Date(echeance * 1000);
          while (x.getTime() / 1000 < maintenant - 7 * 86400) x.setFullYear(x.getFullYear() + 1);
          if (x.getTime() / 1000 <= maintenant + HORIZON_J * 86400) { echeance = Math.floor(x.getTime() / 1000); estimee = true; }
        }
        // À venir (21 j) ou en retard de moins de 14 j sur un devoir encore ouvert : on rattrape
        if (!echeance || echeance < maintenant - RATTRAPAGE_J * 86400 || echeance > maintenant + HORIZON_J * 86400) { note("hors fenêtre de dates"); continue; }

        // Supprimé par l'étudiant : ne jamais le recréer
        const { data: ignore } = await admin.from("depots_ignores").select("cmid").eq("etudiant_id", e.id).eq("cmid", d.cmid);
        if (ignore?.length) { note("supprimé par l'étudiant"); continue; }

        // Déjà suivi par cet étudiant ?
        const { data: deja } = await admin.from("prosit_membres").select("prosit_id, prosits!inner(cmid)")
          .eq("etudiant_id", e.id).eq("prosits.cmid", d.cmid);
        if (deja?.length) { note("déjà suivi"); continue; }

        // Déjà rendu sur Moodle ?
        const st = await ws(jeton, "mod_assign_get_submission_status", { assignid: String(d.id) }).catch(() => null);
        const s = st?.lastattempt?.submission;
        if (s?.status === "submitted") { note(`déjà rendu sur Moodle (modifié le ${new Date((s.timemodified ?? 0) * 1000).toISOString()})`); continue; }
        note(estimee ? `RETENU (échéance estimée ${new Date(echeance * 1000).toISOString()})` : "RETENU");
        if (diag) continue;

        const { data: p, error } = await admin.from("prosits").insert({
          createur_id: e.id, numero: numeroDe(c, d), notion: notionDe(c), cours: c.shortname.replace(/-P\d+$/i, ""),
          cmid: d.cmid, course_id: c.id, groupe: (e.groupe ?? "").trim(), promotion: e.promotion,
          annee: anneeAcad(new Date(echeance * 1000)), echeance: new Date(echeance * 1000).toISOString(),
          source: estimee ? "moodle_date_estimee" : "moodle",
        }).select("id").single();
        if (error || !p) { resultat.push({ etudiant: e.id, cmid: d.cmid, erreur: error?.message }); continue; }
        const imp = await importer(admin, jeton, p.id, c.id).catch((err) => ({ erreur: String(err) }));
        resultat.push({ etudiant: e.id, cmid: d.cmid, action: "cree", estimee, ...imp });
      }
    }
  }

  if ((etudiants ?? []).length && !diag) await admin.from("etudiants").update({ sync_le: new Date().toISOString() }).in("id", (etudiants ?? []).map((x: { id: string }) => x.id));

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
  return rep(200, { etudiants: etudiants?.length ?? 0, actions: resultat, lances, ...(diag ? { vus } : {}) });
});
