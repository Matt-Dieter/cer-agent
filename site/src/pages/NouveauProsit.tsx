import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, anneeCourante, type Etudiant } from "../supabase";

export default function NouveauProsit({ moi }: { moi: Etudiant }) {
  const nav = useNavigate();
  const [f, setF] = useState({ numero: "", notion: "", cours: "", lien: "", groupe: moi.groupe, echeance: "" });
  const [erreur, setErreur] = useState("");
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const cmid = (() => { const m = f.lien.match(/[?&]id=(\d+)/) ?? f.lien.match(/^(\d+)$/); return m ? Number(m[1]) : null; })();

  const creer = async (e: React.FormEvent) => {
    e.preventDefault(); setErreur("");
    if (!cmid) return setErreur("Colle l'adresse du devoir Moodle : elle contient « view.php?id=… ».");
    const { data, error } = await supabase.from("prosits").insert({
      createur_id: moi.id, numero: Number(f.numero), notion: f.notion.trim(), cours: f.cours.trim().toUpperCase(),
      cmid, groupe: f.groupe.trim(), annee: anneeCourante(), echeance: f.echeance ? new Date(f.echeance).toISOString() : null,
    }).select("id").single();
    if (error || !data) return setErreur("Création impossible. Vérifie les champs.");
    nav(`/prosits/${data.id}`);
  };

  return (
    <div className="page">
      <Link to="/" className="mono" style={{ textDecoration: "none" }}>← Tes prosits</Link>
      <div className="entete" style={{ marginTop: "1.4rem" }}>
        <div><span className="meta">À la main</span><h1>Ajouter un prosit</h1></div>
      </div>
      <p className="doux" style={{ marginTop: "1.2rem" }}>D'habitude, CERtain les trouve seul sur Moodle. Passe par ici si un dépôt n'a pas été détecté.</p>
      <form className="champs" onSubmit={creer} style={{ marginTop: "2rem", maxWidth: 680 }}>
        <label>Numéro<input type="number" min={1} max={99} value={f.numero} onChange={maj("numero")} required /></label>
        <label>Cours<input value={f.cours} onChange={maj("cours")} placeholder="GLOG461" /></label>
        <label className="plein">Notion<input value={f.notion} onChange={maj("notion")} placeholder="Analyse et modélisation des exigences" required /></label>
        <label className="plein">Adresse du devoir de dépôt
          <input value={f.lien} onChange={maj("lien")} placeholder="https://moodle.icam-afrique.com/mod/assign/view.php?id=4957" required />
          <span className="mono">{cmid ? `Devoir n° ${cmid} reconnu` : "Ouvre le devoir sur Moodle et copie l'adresse"}</span>
        </label>
        <label>Groupe<input value={f.groupe} onChange={maj("groupe")} placeholder="Groupe 2" required /></label>
        <label>Échéance<input type="datetime-local" value={f.echeance} onChange={maj("echeance")} required /></label>
        {erreur && <small className="erreur plein">{erreur}</small>}
        <div className="plein"><button className="btn">Créer le prosit</button></div>
      </form>
    </div>
  );
}
