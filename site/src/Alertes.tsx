import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

export type Notif = { id: number; type: "depose" | "redepose" | "echec"; titre: string; message: string; prosit_id: string | null; lu: boolean; cree_le: string };

// Notifications reçues en temps réel : compteur dans la barre, titre de l'onglet et bandeau qui s'affiche tout de suite
export function useAlertes(userId: string) {
  const [liste, setListe] = useState<Notif[]>([]);
  const [recue, setRecue] = useState<Notif | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from("notifications").select("*").order("cree_le", { ascending: false }).limit(60);
    setListe((data ?? []) as Notif[]);
  }, []);

  useEffect(() => {
    charger();
    const canal = supabase.channel("notifs-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `etudiant_id=eq.${userId}` },
        (p) => { const n = p.new as Notif; setListe((l) => [n, ...l.filter((x) => x.id !== n.id)]); setRecue(n); })
      .subscribe();
    // Filet de sécurité si la connexion temps réel est coupée : relecture toutes les 60 s
    const minuteur = setInterval(charger, 60_000);
    return () => { clearInterval(minuteur); supabase.removeChannel(canal); };
  }, [userId, charger]);

  const nonLues = liste.filter((n) => !n.lu).length;
  useEffect(() => { document.title = nonLues ? `(${nonLues}) CERtain` : "CERtain"; }, [nonLues]);

  const marquerLue = async (id: number) => {
    setListe((l) => l.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    await supabase.from("notifications").update({ lu: true }).eq("id", id);
  };
  const toutLire = async () => {
    setListe((l) => l.map((n) => ({ ...n, lu: true })));
    await supabase.from("notifications").update({ lu: true }).eq("etudiant_id", userId).eq("lu", false);
  };
  return { liste, nonLues, recue, fermer: () => setRecue(null), marquerLue, toutLire };
}

export function Bandeau({ n, fermer }: { n: Notif | null; fermer: () => void }) {
  const nav = useNavigate();
  useEffect(() => { if (!n) return; const t = setTimeout(fermer, 9000); return () => clearTimeout(t); }, [n, fermer]);
  if (!n) return null;
  return (
    <div className={`bandeau-notif ${n.type}`} role="status" aria-live="polite">
      <button className="corps" onClick={() => { fermer(); nav(n.prosit_id ? `/prosits/${n.prosit_id}` : "/alertes"); }}>
        <b>{n.titre}</b><span>{n.message}</span>
      </button>
      <button className="x" onClick={fermer} aria-label="Fermer">×</button>
    </div>
  );
}

const ecoule = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

export function PageAlertes({ liste, nonLues, marquerLue, toutLire }: Pick<ReturnType<typeof useAlertes>, "liste" | "nonLues" | "marquerLue" | "toutLire">) {
  return (
    <div className="page">
      <div className="entete">
        <div><span className="meta">{nonLues ? `${nonLues} non lue${nonLues > 1 ? "s" : ""}` : "Tout est lu"}</span><h1>Alertes</h1></div>
        {nonLues > 0 && <button className="btn clair" onClick={toutLire}>Tout marquer comme lu</button>}
      </div>
      {liste.length === 0 ? (
        <div className="vide"><h2>Rien pour l'instant.</h2>
          <p className="doux">Tu seras prévenu ici dès qu'un CER est déposé sur Moodle, ou si un dépôt n'a pas pu se faire.</p></div>
      ) : (
        <ul className="liste">
          {liste.map((n) => {
            const contenu = (<>
              <span className={`pastille-type ${n.type}`} aria-hidden />
              <span><span className="titre" style={{ display: "block", fontSize: "1.05rem", fontWeight: n.lu ? 400 : 700 }}>{n.titre}</span>
                <span className="doux">{n.message}</span></span>
              <span className="mono">{ecoule(n.cree_le)}</span></>);
            return (
              <li key={n.id} className={n.lu ? "alerte lue" : "alerte"}>
                {n.prosit_id
                  ? <Link to={`/prosits/${n.prosit_id}`} className="alerte-ligne" onClick={() => !n.lu && marquerLue(n.id)}>{contenu}</Link>
                  : <button className="alerte-ligne" onClick={() => !n.lu && marquerLue(n.id)}>{contenu}</button>}
              </li>);
          })}
        </ul>
      )}
    </div>
  );
}
