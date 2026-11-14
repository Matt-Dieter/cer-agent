import { useState } from "react";
import { supabase, anneeCourante, type Etudiant, type Theme } from "../supabase";
import { GARDES, PALETTES, POLICES, complet, couleurValide } from "../theme";
import ApercuGarde from "../ApercuGarde";

export default function Profil({ moi, onChange }: { moi: Etudiant; onChange: () => void }) {
  const [nom, setNom] = useState(moi.nom);
  const [prenoms, setPrenoms] = useState(moi.prenoms);
  const [groupe, setGroupe] = useState(moi.groupe);
  const [theme, setTheme] = useState<Required<Theme>>(complet(moi.theme));
  const [msg, setMsg] = useState("");

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("etudiants")
      .update({ nom: nom.trim().toUpperCase(), prenoms: prenoms.trim(), groupe: groupe.trim(), theme })
      .eq("id", moi.id);
    setMsg(error ? "Enregistrement impossible." : "Profil enregistré.");
    onChange();
  };

  return (
    <div className="page">
      <h1>Mon profil</h1>

      <section className="carte">
        <h2>1. Mon identité</h2>
        <p className="aide">C'est ce qui apparaît sur la page de garde et dans l'en-tête de ton CER.</p>
        <form className="grille-form" onSubmit={enregistrer} id="profil">
          <label>Nom<input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="MASSOMA" required /></label>
          <label>Prénoms<input value={prenoms} onChange={(e) => setPrenoms(e.target.value)} placeholder="Edouard Matt-Dieter" required /></label>
          <label>Groupe habituel<input value={groupe} onChange={(e) => setGroupe(e.target.value)} placeholder="Groupe 2" /></label>
          <label>Adresse<input value={moi.email} disabled /></label>
        </form>
      </section>

      <LienMoodle moi={moi} onChange={onChange} />

      <section className="carte">
        <h2>3. Mon thème de CER</h2>
        <p className="aide">Ton CER sort avec ton propre style. Le contenu reste celui de ton groupe, rédigé à ta façon.</p>
        <div className="theme">
          <div className="theme-choix">
            <fieldset>
              <legend>Palette</legend>
              <div className="palettes">
                {PALETTES.map((p) => {
                  const actif = p.principale === theme.couleur_principale && p.accent === theme.couleur_accent;
                  return (
                    <button type="button" key={p.nom} className={"palette" + (actif ? " actif" : "")} aria-pressed={actif}
                      onClick={() => setTheme({ ...theme, couleur_principale: p.principale, couleur_accent: p.accent })}>
                      <span style={{ background: `#${p.principale}` }} /><span style={{ background: `#${p.accent}` }} />
                      {p.nom}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="ligne">
              <Couleur label="Couleur principale" valeur={theme.couleur_principale}
                onChange={(v) => setTheme({ ...theme, couleur_principale: v })} />
              <Couleur label="Couleur d'accent" valeur={theme.couleur_accent}
                onChange={(v) => setTheme({ ...theme, couleur_accent: v })} />
            </div>
            <label>Police
              <select value={theme.police} onChange={(e) => setTheme({ ...theme, police: e.target.value })}>
                {POLICES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <fieldset>
              <legend>Page de garde</legend>
              <div className="segments">
                {GARDES.map((g) => (
                  <button type="button" key={g.id} aria-pressed={theme.garde === g.id}
                    className={theme.garde === g.id ? "actif" : ""} onClick={() => setTheme({ ...theme, garde: g.id })}>{g.nom}</button>
                ))}
              </div>
            </fieldset>
          </div>
          <ApercuGarde theme={theme} nom={`${prenoms} ${nom.toUpperCase()}`.trim()} groupe={groupe} annee={anneeCourante()} />
        </div>
      </section>

      <div className="actions">
        {msg && <span className="info-ligne">{msg}</span>}
        <button className="principal" form="profil">Enregistrer mon profil</button>
      </div>
    </div>
  );
}

function Couleur({ label, valeur, onChange }: { label: string; valeur: string; onChange: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur);
  const valide = couleurValide(texte);
  return (
    <label>{label}
      <span className="couleur">
        <input type="color" value={`#${valeur}`} onChange={(e) => {
          const v = e.target.value.slice(1).toUpperCase(); setTexte(v); if (couleurValide(v)) onChange(v);
        }} />
        <input value={texte} maxLength={6} onChange={(e) => {
          const v = e.target.value.replace("#", "").toUpperCase(); setTexte(v); if (couleurValide(v)) onChange(v);
        }} aria-invalid={!valide} />
      </span>
      {!valide && <small className="erreur">Trop clair pour être lisible : choisis une teinte plus foncée.</small>}
    </label>
  );
}

function LienMoodle({ moi, onChange }: { moi: Etudiant; onChange: () => void }) {
  const [identifiant, setIdentifiant] = useState(moi.email);
  const [mdp, setMdp] = useState("");
  const [etat, setEtat] = useState<"" | "envoi">("");
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);

  const relier = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("envoi"); setMsg(null);
    const { data, error } = await supabase.functions.invoke("relier-moodle", { body: { identifiant, mot_de_passe: mdp } });
    setMdp(""); setEtat("");
    if (error) {
      const corps = await (error as { context?: Response }).context?.json?.().catch(() => null);
      setMsg({ ok: false, texte: corps?.erreur ?? "La liaison a échoué." });
    } else {
      setMsg({ ok: true, texte: `Compte Moodle relié${data?.nom_moodle ? ` : ${data.nom_moodle}` : ""}.` });
      onChange();
    }
  };
  const delier = async () => {
    if (!confirm("Délier ton compte Moodle ? CERtain ne pourra plus déposer pour toi.")) return;
    await supabase.rpc("delier_moodle"); onChange();
  };

  return (
    <section className="carte">
      <h2>2. Mon compte Moodle</h2>
      {moi.moodle_relie ? (
        <div className="ligne-etat">
          <span className="badge ok">Relié</span>
          <span>CERtain peut déposer tes CER sur moodle.icam-afrique.com.</span>
          <button className="secondaire" onClick={delier}>Délier</button>
        </div>
      ) : (
        <form className="grille-form" onSubmit={relier}>
          <p className="aide pleine">Ton mot de passe sert une seule fois à obtenir une clé d'accès Moodle. Il n'est jamais enregistré. Tu peux délier à tout moment, ou réinitialiser ta clé dans Moodle (Préférences → Clés de sécurité).</p>
          <label>Identifiant Moodle<input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" required /></label>
          <label>Mot de passe Moodle<input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="current-password" required /></label>
          <div className="pleine"><button className="principal" disabled={etat === "envoi"}>{etat === "envoi" ? "Vérification…" : "Relier mon Moodle"}</button></div>
        </form>
      )}
      {msg && <div className={msg.ok ? "info" : "erreur"}>{msg.texte}</div>}
    </section>
  );
}
