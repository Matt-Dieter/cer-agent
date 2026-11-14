// Relie le compte Moodle d'un étudiant connecté.
// Reçoit { identifiant, mot_de_passe }, demande un jeton à Moodle, le chiffre dans Vault.
// Le mot de passe n'est jamais stocké ni journalisé.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const MOODLE = "https://moodle.icam-afrique.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const rep = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return rep(405, { erreur: "Méthode non autorisée" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: { user }, error: errUser } = await admin.auth.getUser(jwt);
  if (errUser || !user) return rep(401, { erreur: "Connecte-toi d'abord." });

  let identifiant = "", mot_de_passe = "";
  try { ({ identifiant, mot_de_passe } = await req.json()); } catch { /* corps invalide */ }
  identifiant = (identifiant ?? "").trim();
  if (!identifiant || !mot_de_passe) return rep(400, { erreur: "Identifiant et mot de passe requis." });

  // Une seule tentative par appel : jamais de boucle (risque de blocage du compte Moodle)
  const r = await fetch(`${MOODLE}/login/token.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: identifiant, password: mot_de_passe, service: "moodle_mobile_app" }),
  });
  const moodle = await r.json().catch(() => ({}));
  if (!moodle.token) {
    return rep(400, { erreur: moodle.errorcode === "invalidlogin"
      ? "Moodle a refusé ces identifiants. Vérifie-les sur moodle.icam-afrique.com avant de réessayer : plusieurs échecs peuvent bloquer ton compte."
      : "Moodle n'a pas répondu correctement. Réessaie plus tard." });
  }

  // Vérifie que le compte Moodle appartient bien à l'étudiant connecté (même e-mail)
  const infos = await fetch(`${MOODLE}/webservice/rest/server.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ wstoken: moodle.token, wsfunction: "core_webservice_get_site_info", moodlewsrestformat: "json" }),
  }).then((x) => x.json()).catch(() => ({}));
  const profil = await fetch(`${MOODLE}/webservice/rest/server.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ wstoken: moodle.token, wsfunction: "core_user_get_users_by_field", moodlewsrestformat: "json",
      field: "id", "values[0]": String(infos.userid ?? "") }),
  }).then((x) => x.json()).catch(() => []);
  const emailMoodle = (Array.isArray(profil) && profil[0]?.email || "").toLowerCase();
  if (emailMoodle && emailMoodle !== (user.email ?? "").toLowerCase()) {
    return rep(403, { erreur: "Ce compte Moodle n'est pas au nom de ton adresse e-mail." });
  }

  const { error } = await admin.rpc("serveur_enregistrer_jeton", {
    p_etudiant: user.id, p_user: identifiant, p_jeton: moodle.token,
  });
  if (error) return rep(500, { erreur: "Enregistrement impossible, réessaie plus tard." });

  const nomComplet: string = infos.fullname ?? "";
  return rep(200, { ok: true, nom_moodle: nomComplet });
});
