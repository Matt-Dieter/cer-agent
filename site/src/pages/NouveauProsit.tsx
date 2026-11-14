import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, anneeCourante, type Etudiant } from "../supabase";

export default function NouveauProsit({ moi }: { moi: Etudiant }) {
  const nav = useNavigate();
  const [f, setF] = useState({ numero: "", notion: "", cours: "", lien: "", groupe: moi.groupe, echeance: "" });
  const [erreur, setErreur] = useState("");
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const cmid = (() => { const m = f.lien.match(/[?&]id=(\d+)/) ?? f.lien.match(/^(\d+)$/); return m ? Number(m[1]) : null; })();

  const creer = async (e: React.FormEvent) => {
    e.preventDefault(); setErreur("");
    if (!cmid) return setErreur("Colle l'adresse du devoir Moodle (elle contient « view.php?id=… »).");
    const { data, error } = await supabase.from("prosits").insert({
      createur_id: moi.id, numero: Number(f.numero), notion: f.notion.trim(), cours: f.cours.trim().toUpperCase(),
      cmid, groupe: f.groupe.trim(), annee: anneeCourante(),
      echeance: f.echeance ? new Date(f.echeance).toISOString() : null,
    }).select("id").single();
    if (error || !data) return setErreur("Création impossible. Vérifie les champs.");
    nav(`/prosits/${data.id}`);
  };

  return (
    <div className="page">
      <h1>Nouveau prosit</h1>
      <form className="carte grille-form" onSubmit={creer}>
        <label>Numéro du prosit<input type="number" min={1} max={99} value={f.numero} onChange={maj("numero")} required /></label>
        <label>Cours<input value={f.cours} onChange={maj("cours")} placeholder="GLOG461" /></label>
        <label className="pleine">Notion du prosit<input value={f.notion} onChange={maj("notion")} placeholder="Analyse et modélisation des exigences" required /></label>
        <label className="pleine">Adresse du devoir de dépôt sur Moodle
          <input value={f.lien} onChange={maj("lien")} placeholder="https://moodle.icam-afrique.com/mod/assign/view.php?id=4957" required />
          <small className="aide">{cmid ? `Devoir n° ${cmid} reconnu.` : "Ouvre le devoir « Dépôt CER » sur Moodle et copie l'adresse."}</small>
        </label>
        <label>Groupe<input value={f.groupe} onChange={maj("groupe")} placeholder="Groupe 2" required /></label>
        <label>Échéance du dépôt<input type="datetime-local" value={f.echeance} onChange={maj("echeance")} required /></label>
        {erreur && <div className="erreur pleine">{erreur}</div>}
        <div className="pleine actions"><button className="principal">Créer et ajouter les documents</button></div>
      </form>
    </div>
  );
}
