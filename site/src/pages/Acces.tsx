import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Ligne = { email: string; ajoute_le: string; inscrit: boolean; moodle_relie: boolean; actif: boolean; role: string; nom: string; promotion: string | null };

// Réservé à l'administrateur : qui peut utiliser CERtain
export default function Acces() {
  const [liste, setListe] = useState<Ligne[] | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = async () => {
    const { data } = await supabase.rpc("admin_lister_acces");
    setListe((data ?? []) as Ligne[]);
  };
  useEffect(() => { charger(); }, []);

  const autoriser = async (e: React.FormEvent) => {
    e.preventDefault();
    const adresses = email.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    let ok = 0; const refus: string[] = [];
    for (const a of adresses) {
      const { error } = await supabase.rpc("admin_autoriser", { p_email: a });
      if (error) refus.push(a); else ok++;
    }
    setMsg(refus.length ? { ok: false, texte: `${ok} ajoutée(s). Refusée(s), il faut une adresse @ucac-icam.com : ${refus.join(", ")}` }
      : { ok: true, texte: `${ok} adresse${ok > 1 ? "s" : ""} autorisée${ok > 1 ? "s" : ""}. Envoie-leur le lien du site.` });
    setEmail(""); charger();
  };
  const retirer = async (l: Ligne) => {
    if (!confirm(`Retirer l'accès de ${l.nom || l.email} ? Son compte ne verra plus rien et CERtain cessera de déposer pour lui.`)) return;
    const { error } = await supabase.rpc("admin_retirer", { p_email: l.email });
    setMsg(error ? { ok: false, texte: error.message } : { ok: true, texte: `Accès retiré pour ${l.email}.` });
    charger();
  };

  return (
    <div className="page">
      <div className="entete">
        <div><span className="meta">Administration</span><h1>Accès</h1></div>
        <span className="mono">{liste ? `${liste.length} personne${liste.length > 1 ? "s" : ""} autorisée${liste.length > 1 ? "s" : ""}` : ""}</span>
      </div>
      <p className="doux" style={{ marginTop: "1.2rem" }}>Seules les adresses de cette liste peuvent créer un compte. Retirer quelqu'un coupe son accès tout de suite : il ne voit plus rien et CERtain arrête de rédiger et de déposer pour lui.</p>

      <form onSubmit={autoriser} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", margin: "1.6rem 0 2rem", maxWidth: 640 }}>
        <label style={{ flex: 1 }}>Ajouter une ou plusieurs adresses
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@2029.ucac-icam.com, autre@…" required />
        </label>
        <button className="btn">Autoriser</button>
      </form>
      {msg && <div className={msg.ok ? "message" : "message erreur"}>{msg.texte}</div>}

      <ul className="lignes">
        {(liste ?? []).map((l) => (
          <li key={l.email}>
            <span>
              {l.nom || <span className="doux">pas encore inscrit</span>}
              <span className="mono" style={{ display: "block" }}>{l.email}{l.promotion ? ` · promotion ${l.promotion}` : ""}</span>
            </span>
            <span style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
              <span className={`statut ${!l.inscrit ? "" : l.moodle_relie ? "ok" : "attention"}`}>
                {l.role === "admin" ? "administrateur" : !l.inscrit ? "invité" : l.moodle_relie ? "Moodle relié" : "Moodle à relier"}
              </span>
              {l.role !== "admin" && <button className="lien" onClick={() => retirer(l)}>Retirer</button>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
