import { useState } from "react";
import { supabase } from "../supabase";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  const [erreur, setErreur] = useState("");

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    const adresse = email.trim().toLowerCase();
    if (!/@([a-z0-9-]+\.)*ucac-icam\.com$/.test(adresse)) {
      return setErreur("Utilise ton adresse de l'école (…@ucac-icam.com).");
    }
    setEtat("envoi");
    const { error } = await supabase.auth.signInWithOtp({
      email: adresse,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) { setEtat("saisie"); setErreur("L'envoi a échoué. Réessaie dans une minute."); }
    else setEtat("envoye");
  };

  return (
    <div className="accueil">
      <div className="carte connexion">
        <div className="logo grand">CER<span>tain</span></div>
        <p className="accroche">Ton CER de prosit rédigé avec ton groupe et déposé à temps sur Moodle. Tu es prévenu la veille, tu peux toujours annuler.</p>
        {etat === "envoye" ? (
          <div className="info">Lien de connexion envoyé à <b>{email}</b>. Ouvre-le depuis cet appareil.</div>
        ) : (
          <form onSubmit={envoyer}>
            <label htmlFor="email">Adresse de l'école</label>
            <input id="email" type="email" autoComplete="email" placeholder="prenom.nom@2029.ucac-icam.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            {erreur && <div className="erreur">{erreur}</div>}
            <button className="principal" disabled={etat === "envoi"}>
              {etat === "envoi" ? "Envoi…" : "Recevoir mon lien de connexion"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
