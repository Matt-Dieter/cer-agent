import { useState } from "react";
import { supabase } from "../supabase";
import Themes from "../Themes";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  const [erreur, setErreur] = useState("");

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
          <div>
            <span className="meta">Vérifie ta boîte</span>
            <h2 style={{ margin: ".6rem 0 1rem" }}>Un lien vient de partir vers <em>{email}</em>.</h2>
            <p className="doux">Ouvre-le depuis ce navigateur. Pense aux courriers indésirables : il vient de noreply@mail.app.supabase.io.</p>
            <button className="lien" onClick={() => setEtat("saisie")}>Changer d'adresse</button>
          </div>
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
