import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, STATUTS, type Etudiant, type Membre, type Prosit } from "../supabase";

export default function Prosits({ moi }: { moi: Etudiant }) {
  const [liste, setListe] = useState<(Prosit & { moi: Membre })[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("prosit_membres")
        .select("*, prosits(*)").eq("etudiant_id", moi.id);
      setListe((data ?? []).map((m: Membre & { prosits: Prosit }) => ({ ...m.prosits, moi: m }))
        .sort((a, b) => (b.echeance ?? "").localeCompare(a.echeance ?? "")));
    })();
  }, [moi.id]);

  const invitations = liste?.filter((p) => p.moi.invitation === "invite") ?? [];
  const actifs = liste?.filter((p) => p.moi.invitation === "accepte") ?? [];

  return (
    <div className="page">
      <div className="titre-ligne">
        <h1>Mes prosits</h1>
        <Link className="principal bouton" to="/prosits/nouveau">Nouveau prosit</Link>
      </div>
      {liste === null && <p className="aide">Chargement…</p>}
      {invitations.length > 0 && (
        <section>
          <h2>Invitations</h2>
          {invitations.map((p) => <Ligne key={p.id} p={p} />)}
        </section>
      )}
      {liste && actifs.length === 0 && invitations.length === 0 && (
        <div className="carte vide">
          <p>Aucun prosit pour l'instant.</p>
          <p className="aide">Un membre de ton groupe crée le prosit, ajoute l'énoncé, l'aller et le retour, puis invite les autres. Chacun reçoit son propre CER.</p>
        </div>
      )}
      {actifs.length > 0 && <section>{actifs.map((p) => <Ligne key={p.id} p={p} />)}</section>}
    </div>
  );
}

function Ligne({ p }: { p: Prosit & { moi: Membre } }) {
  const ech = p.echeance ? new Date(p.echeance).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "sans échéance";
  return (
    <Link to={`/prosits/${p.id}`} className="carte ligne-prosit">
      <div>
        <div className="petit">{p.cours || "Cours"} · Prosit {p.numero}</div>
        <div className="titre-prosit">{p.notion}</div>
        <div className="petit">Échéance : {ech}</div>
      </div>
      <span className={`badge ${p.moi.annule ? "neutre" : p.statut}`}>
        {p.moi.invitation === "invite" ? "Invitation" : p.moi.annule ? "Annulé pour moi" : STATUTS[p.statut]}
      </span>
    </Link>
  );
}
