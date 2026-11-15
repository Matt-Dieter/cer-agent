import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, STATUTS, TON, dateCourte, delai, type Etudiant, type Membre, type Prosit } from "../supabase";

type Ligne = Prosit & { moi: Membre };

export default function Prosits({ moi }: { moi: Etudiant }) {
  const [liste, setListe] = useState<Ligne[] | null>(null);
  const [synchro, setSynchro] = useState<"" | "encours" | string>("");

  const charger = async () => {
    const { data } = await supabase.from("prosit_membres").select("*, prosits(*)").eq("etudiant_id", moi.id);
    setListe((data ?? []).map((m: Membre & { prosits: Prosit }) => ({ ...m.prosits, moi: m }))
      .sort((a, b) => (a.echeance ?? "9").localeCompare(b.echeance ?? "9")));
  };
  useEffect(() => { charger(); }, [moi.id]);

  const actualiser = async () => {
    setSynchro("encours");
    const { data, error } = await supabase.functions.invoke("synchroniser");
    const n = (data?.actions ?? []).filter((a: { action?: string }) => a.action).length;
    setSynchro(error ? "La lecture de Moodle a échoué. Réessaie plus tard." : n ? `${n} nouveau${n > 1 ? "x" : ""} CER trouvé${n > 1 ? "s" : ""} sur Moodle.` : "Rien de nouveau sur Moodle.");
    charger();
  };

  const maintenant = new Date().toISOString();
  const invitations = liste?.filter((p) => p.moi.invitation === "invite") ?? [];
  const actifs = liste?.filter((p) => p.moi.invitation === "accepte") ?? [];
  const aVenir = actifs.filter((p) => p.statut !== "depose" && (!p.echeance || p.echeance > maintenant));
  const passes = actifs.filter((p) => !aVenir.includes(p));

  return (
    <div className="page">
      <div className="entete">
        <div>
          <span className="meta">{moi.groupe || "Ton espace"} · {moi.auto ? "suivi automatique" : "suivi manuel"}</span>
          <h1>Tes prosits</h1>
        </div>
        <button className="btn clair" onClick={actualiser} disabled={synchro === "encours"}>
          {synchro === "encours" ? "Lecture de Moodle…" : "Actualiser depuis Moodle"}
        </button>
      </div>
      {synchro && synchro !== "encours" && <div className="message">{synchro}</div>}

      {liste === null && <p className="doux" style={{ paddingTop: "2rem" }}>Chargement…</p>}

      {invitations.length > 0 && <>
        <div className="sous-titre"><span className="meta">Invitations</span></div>
        <ul className="liste">{invitations.map((p) => <Rang key={p.id} p={p} />)}</ul>
      </>}

      {liste && aVenir.length === 0 && invitations.length === 0 && (
        <div className="vide">
          <h2>Rien à rendre <em>pour l'instant.</em></h2>
          <p className="doux">CERtain regarde Moodle toutes les heures. Dès qu'un dépôt de CER s'ouvre dans un de tes cours de prosit, il apparaît ici avec l'énoncé déjà importé.</p>
          <Link className="lien" to="/prosits/nouveau">Ajouter un prosit à la main</Link>
        </div>
      )}
      {aVenir.length > 0 && <ul className="liste">{aVenir.map((p) => <Rang key={p.id} p={p} />)}</ul>}

      {passes.length > 0 && <>
        <div className="sous-titre"><span className="meta">Terminés</span></div>
        <ul className="liste">{passes.map((p) => <Rang key={p.id} p={p} />)}</ul>
      </>}

      {aVenir.length > 0 && <p style={{ marginTop: "2rem" }}><Link className="lien" to="/prosits/nouveau">Ajouter un prosit à la main</Link></p>}
    </div>
  );
}

function Rang({ p }: { p: Ligne }) {
  const statut = p.moi.invitation === "invite" ? "Invitation" : p.moi.annule ? "Annulé pour toi" : STATUTS[p.statut];
  const ton = p.moi.invitation === "invite" ? "attention" : p.moi.annule ? "" : TON[p.statut];
  return (
    <li>
      <Link to={`/prosits/${p.id}`} className="prosit">
        <span className="num">P{p.numero}</span>
        <span>
          <span className="meta">{p.cours || "Prosit"}{p.source === "moodle" ? " · depuis Moodle" : ""}</span>
          <span className="titre" style={{ display: "block", marginTop: ".2rem" }}>{p.notion}</span>
        </span>
        <span className="droite">
          <span className="mono">{dateCourte(p.echeance)}{p.statut !== "depose" && delai(p.echeance) ? ` · ${delai(p.echeance)}` : ""}</span>
          <span className={`statut ${ton}`}>{statut}</span>
        </span>
      </Link>
    </li>
  );
}
