import { useState } from "react";
import { supabase, anneeCourante, type Etudiant } from "../supabase";
import { complet, type ThemeComplet } from "../theme";
import Style from "../Style";

export default function Profil({ moi, onChange }: { moi: Etudiant; onChange: () => void }) {
  const [nom, setNom] = useState(moi.nom);
  const [prenoms, setPrenoms] = useState(moi.prenoms);
  const [groupe, setGroupe] = useState(moi.groupe);
  const [auto, setAuto] = useState(moi.auto);
  const [theme, setTheme] = useState<ThemeComplet>(complet(moi.theme));
  const [msg, setMsg] = useState("");

  const enregistrer = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const { error } = await supabase.from("etudiants")
      .update({ nom: nom.trim().toUpperCase(), prenoms: prenoms.trim(), groupe: groupe.trim(), theme, auto }).eq("id", moi.id);
    setMsg(error ? "L'enregistrement n'est pas passé." : "Enregistré.");
    onChange();
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div className="page">
      <div className="entete">
        <div><span className="meta">{moi.email} · {moi.credits} crédit{moi.credits > 1 ? "s" : ""}</span><h1>Ton profil</h1></div>
        <div className="actions" style={{ margin: 0 }}>
          {msg && <span className="mono">{msg}</span>}
          <button className="btn" form="profil">Enregistrer</button>
        </div>
      </div>

      <section className="bloc">
        <header><span className="meta">01</span><h2>Identité</h2><p>Elle figure sur la page de garde et dans l'en-tête de ton CER.</p></header>
        <form className="champs" onSubmit={enregistrer} id="profil">
          <label>Nom<input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="MASSOMA" required /></label>
          <label>Prénoms<input value={prenoms} onChange={(e) => setPrenoms(e.target.value)} placeholder="Edouard Matt-Dieter" required /></label>
          <label className="plein">Ton groupe de prosit<input value={groupe} onChange={(e) => setGroupe(e.target.value)} placeholder="Groupe 2" />
            <span className="mono">Le petit groupe qui fait le prosit avec toi, pas ta promotion. Écris-le comme tes camarades (« Groupe 2 ») : vous serez réunis sur le même prosit. Il ne figure pas sur ton CER.</span></label>
          <label>Promotion<input value={moi.promotion ? `Promotion ${moi.promotion}` : "Non reconnue"} disabled />
            <span className="mono">Déduite de ton adresse e-mail. Deux promotions ne sont jamais mélangées.</span></label>
        </form>
      </section>

      <LienMoodle moi={moi} onChange={onChange} />

      <section className="bloc">
        <header><span className="meta">03</span><h2>Suivi</h2><p>Ce que CERtain fait sans te demander.</p></header>
        <div>
          <label className="interrupteur">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Suivre seul les CER à rendre sur Moodle
          </label>
          <p className="doux" style={{ fontSize: ".9rem", marginTop: ".8rem" }}>
            {auto ? "Régulièrement (environ toutes les heures), CERtain lit tes cours de prosit. Un nouveau dépôt de CER ? Il crée le prosit, importe l'énoncé, lance la rédaction la veille de l'échéance et dépose ton CER dès qu'il est prêt. Tu relis ensuite et tu peux le remplacer."
              : "CERtain ne crée rien seul. Utilise « Actualiser depuis Moodle » sur la page des prosits."}
          </p>
        </div>
      </section>

      <section className="bloc bloc-large">
        <header><span className="meta">04</span><h2>Ton style</h2><p>La forme de ton CER, de la garde aux numéros de page. Le fond reste celui du groupe, rédigé à ta façon.</p></header>
        <Style theme={theme} onChange={setTheme} nom={`${prenoms} ${nom.toUpperCase()}`.trim()} annee={anneeCourante()} />
      </section>
    </div>
  );
}

function LienMoodle({ moi, onChange }: { moi: Etudiant; onChange: () => void }) {
  const [identifiant, setIdentifiant] = useState(moi.email);
  const [mdp, setMdp] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);

  const relier = async (e: React.FormEvent) => {
    e.preventDefault(); setEnvoi(true); setMsg(null);
    const { data, error } = await supabase.functions.invoke("relier-moodle", { body: { identifiant, mot_de_passe: mdp } });
    setMdp(""); setEnvoi(false);
    if (error) {
      const corps = await (error as { context?: Response }).context?.json?.().catch(() => null);
      setMsg({ ok: false, texte: corps?.erreur ?? "La liaison n'a pas abouti." });
    } else {
      setMsg({ ok: true, texte: `Relié${data?.nom_moodle ? ` au compte de ${data.nom_moodle}` : ""}.` });
      onChange();
    }
  };
  const delier = async () => {
    if (!confirm("Délier ton compte Moodle ? CERtain ne pourra plus rien lire ni déposer pour toi.")) return;
    await supabase.rpc("delier_moodle"); onChange();
  };

  return (
    <section className="bloc">
      <header><span className="meta">02</span><h2>Moodle</h2><p>Ton mot de passe sert une fois, pour obtenir une clé d'accès. Il n'est jamais gardé.</p></header>
      <div>
        {moi.moodle_relie ? (
          <p><span className="statut ok">Relié à moodle.icam-afrique.com</span> &nbsp;
            <button className="lien" onClick={delier}>Délier</button></p>
        ) : (
          <form className="champs" onSubmit={relier}>
            <label>Identifiant<input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" required /></label>
            <label>Mot de passe<input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required /></label>
            <div className="plein"><button className="btn" disabled={envoi}>{envoi ? "Vérification…" : "Relier mon Moodle"}</button></div>
          </form>
        )}
        {msg && <div className={msg.ok ? "message" : "message erreur"}>{msg.texte}</div>}
        <p className="doux" style={{ fontSize: ".85rem", marginTop: "1rem" }}>Pour couper l'accès depuis Moodle : Préférences → Clés de sécurité → Réinitialiser.</p>
      </div>
    </section>
  );
}
