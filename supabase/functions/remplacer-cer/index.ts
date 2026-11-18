// Un étudiant remplace son CER après relecture (fichier .docx corrigé).
// Le fichier remplace sa version dans le stockage ; la base redépose aussitôt sur Moodle.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};
const MAX = 20 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const rep = (s: number, c: unknown) => new Response(JSON.stringify(c), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return rep(401, { erreur: "Connecte-toi d'abord." });

  const form = await req.formData().catch(() => null);
  const prosit = String(form?.get("prosit") ?? "");
  const fichier = form?.get("fichier");
  if (!/^[0-9a-f-]{36}$/.test(prosit) || !(fichier instanceof File)) return rep(400, { erreur: "Fichier ou prosit manquant." });
  if (!/\.docx$/i.test(fichier.name) || fichier.size > MAX) return rep(400, { erreur: "Un fichier Word (.docx) de 20 Mo au plus." });

  const { data: moi } = await admin.from("etudiants").select("nom, prenoms, actif").eq("id", user.id).single();
  if (!moi?.actif) return rep(403, { erreur: "Ton accès à CERtain a été retiré." });
  const { data: membre } = await admin.from("prosit_membres").select("invitation")
    .eq("prosit_id", prosit).eq("etudiant_id", user.id).single();
  if (membre?.invitation !== "accepte") return rep(403, { erreur: "Tu ne fais pas partie de ce prosit." });
  const { data: p } = await admin.from("prosits").select("numero").eq("id", prosit).single();

  const propre = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_");
  const chemin = `${prosit}/CER_Prosit_${p?.numero ?? ""}_${propre(moi.nom)}_${propre(moi.prenoms.split(" ")[0] ?? "")}_corrige.docx`;
  const { error } = await admin.storage.from("prosits").upload(chemin, fichier, {
    upsert: true, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  if (error) return rep(500, { erreur: "Enregistrement impossible, réessaie." });

  await admin.from("prosit_membres").update({
    fichier: chemin, fichier_maj_le: new Date().toISOString(), annule: false, depot_statut: "Version corrigée reçue",
  }).eq("prosit_id", prosit).eq("etudiant_id", user.id);
  return rep(200, { ok: true });
});
