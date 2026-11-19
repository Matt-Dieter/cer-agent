import { useState } from "react";
import { supabase } from "../supabase";
import Themes from "../Themes";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  // Si le lien de l'e-mail a expiré ou a déjà servi, Supabase revient ici avec l'erreur dans l'adresse
  const [erreur, setErreur] = useState(() => {
    const h = new URLSearchParams(window.location.hash.replace(/^#\/?/, ""));
    const code = h.get("error_code");
    if (!code) return "";
    history.replaceState(null, "", window.location.pathname);
    return code === "otp_expired"
      ? "Ce lien a expiré ou a déjà servi : un lien ne marche qu'une fois et pendant une heure. Demande un nouveau lien et ouvre le plus récent, ou saisis le code reçu."
      : "La connexion par le lien n'a pas abouti. Demande un nouveau lien.";
  });
  const [code, setCode] = useState("");
  const [verif, setVerif] = useState(false);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    const adresse = email.trim().toLowerCase();
    if (!/@([a-z0-9-]+\.)*ucac-icam\.com$/.test(adresse)) return setErreur("Il faut ton adresse de l'école, en …@ucac-icam.com.");
    setEtat("envoi");
    const { error } = await supabase.auth.signInWithOtp({
      email: adresse, options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setEtat("saisie");
      // Le refus de la liste d'accès remonte comme une erreur de base de données à l'inscription
      setErreur(/database|saving new user|autoris/i.test(error.message)
        ? "Cette adresse n'est pas encore autorisée sur CERtain. Demande l'accès à l'administrateur."
        : error.status === 429 || /rate limit/i.test(error.message)
        ? "Trop de liens envoyés en peu de temps. Réessaie dans une heure, ou utilise le dernier lien reçu s'il date de moins d'une heure."
        : "L'envoi n'est pas passé. Réessaie dans une minute.");
    }
    else setEtat("envoye");
  };

  const verifier = async (e: React.FormEvent) => {
    e.preventDefault(); setErreur(""); setVerif(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setVerif(false);
    if (error) setErreur("Code incorrect ou expiré. Vérifie les chiffres, ou demande un nouveau code.");
  };

  return (
    <div className="ouverture">
      <Themes />
      <section className="gauche">
        <div className="marque">CER<i>tain</i></div>
        <div>
          <h1>Le CER rendu, <em>sans y penser.</em></h1>
          <p className="doux" style={{ marginTop: "1.2rem" }}>Pour les prosits de l'Ucac-Icam.</p>
        </div>
        <ol>
          <li>CERtain lit tes devoirs sur Moodle et repère les CER à rendre.</li>
          <li>Il rédige le compte rendu de ton groupe, à ton nom et dans ton style.</li>
          <li>Il le dépose seul avant l'échéance. Tu relis ensuite, et tu peux le remplacer.</li>
        </ol>
      </section>
      <section className="droite">
        {etat === "envoye" ? (
          <form onSubmit={verifier}>
            <div>
              <span className="meta">Vérifie ta boîte</span>
              <h2 style={{ marginTop: ".6rem" }}>Un e-mail vient de partir vers <em>{email}</em>.</h2>
            </div>
            <p className="doux" style={{ margin: 0 }}>Clique sur le lien depuis ce navigateur, ou saisis ici le code reçu. Le lien et le code marchent une seule fois, pendant une heure. Regarde aussi les courriers indésirables.</p>
            <label>Code reçu par e-mail
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="123456"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </label>
            {erreur && <small className="erreur">{erreur}</small>}
            <div style={{ display: "flex", gap: "1.2rem", alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn" disabled={code.length < 6 || verif}>{verif ? "Vérification…" : "Me connecter"}</button>
              <button type="button" className="lien" onClick={() => { setEtat("saisie"); setCode(""); setErreur(""); }}>Renvoyer ou changer d'adresse</button>
            </div>
          </form>
        ) : (
          <form onSubmit={envoyer}>
            <div>
              <span className="meta">Connexion</span>
              <h2 style={{ marginTop: ".6rem" }}>Pas de mot de passe : un lien par e‑mail.</h2>
            </div>
            <label>Adresse de l'école
              <input type="email" autoComplete="email" placeholder="prenom.nom@2029.ucac-icam.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {erreur && <small className="erreur">{erreur}</small>}
            <div><button className="btn" disabled={etat === "envoi"}>{etat === "envoi" ? "Envoi…" : "Recevoir mon lien"}</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
