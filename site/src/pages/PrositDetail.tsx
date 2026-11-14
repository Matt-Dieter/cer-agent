import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, STATUTS, type Etudiant, type Membre, type Prosit } from "../supabase";

type MembreNom = Membre & { etudiants: { nom: string; prenoms: string } | null };
const DOCS = [
  { id: "enonce", nom: "Énoncé du prosit", aide: "Texte de la situation, personnages" },
  { id: "aller", nom: "Prosit aller", aide: "Mots clés, problématique, pistes, plan d'action" },
  { id: "retour", nom: "Prosit retour", aide: "Verdicts des pistes, corrections du tuteur" },
] as const;

export default function PrositDetail({ moi }: { moi: Etudiant }) {
  const { id } = useParams();
  const [p, setP] = useState<Prosit | null>(null);
  const [membres, setMembres] = useState<MembreNom[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const charger = async () => {
    const [{ data: pr }, { data: mb }, { data: fichiers }] = await Promise.all([
      supabase.from("prosits").select("*").eq("id", id).single(),
      supabase.from("prosit_membres").select("*, etudiants(nom, prenoms)").eq("prosit_id", id),
      supabase.storage.from("prosits").list(id),
    ]);
    setP(pr as Prosit); setMembres((mb ?? []) as MembreNom[]); setDocs((fichiers ?? []).map((f) => f.name));
  };
  useEffect(() => { charger(); }, [id]);

  if (!p) return <div className="page"><p className="aide">Chargement…</p></div>;
  const moiMembre = membres.find((m) => m.etudiant_id === moi.id);
  const createur = p.createur_id === moi.id;
  const modifiable = createur && ["brouillon", "en_attente"].includes(p.statut);
  const docPresent = (d: string) => docs.find((n) => n.startsWith(d + "."));

  const envoyerDoc = async (d: string, fichier: File) => {
    const ext = fichier.name.split(".").pop()?.toLowerCase() ?? "txt";
    const { error } = await supabase.storage.from("prosits").upload(`${id}/${d}.${ext}`, fichier, { upsert: false });
    setMsg(error ? "Envoi refusé (un document de ce type existe peut-être déjà)." : "Document ajouté.");
    charger();
  };
  const inviter = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    const { data } = await supabase.rpc("trouver_etudiant", { p_email: email });
    const cible = (data ?? [])[0];
    if (!cible) return setMsg("Aucun étudiant inscrit avec cette adresse. Demande-lui de créer son compte CERtain.");
    const { error } = await supabase.from("prosit_membres").insert({ prosit_id: id, etudiant_id: cible.id });
    setMsg(error ? "Déjà membre, ou invitation impossible." : `${cible.prenoms || email} invité·e.`);
    setEmail(""); charger();
  };
  const repondre = async (champs: Partial<Membre>) => {
    await supabase.from("prosit_membres").update(champs).eq("prosit_id", id).eq("etudiant_id", moi.id); charger();
  };
  const lancer = async () => {
    await supabase.from("prosits").update({ statut: "en_attente" }).eq("id", id); charger();
  };
  const telecharger = async (chemin: string) => {
    const { data } = await supabase.storage.from("prosits").createSignedUrl(chemin, 120);
    if (data) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="page">
      <div className="petit">{p.cours} · Prosit {p.numero} · {p.groupe}</div>
      <div className="titre-ligne"><h1>{p.notion}</h1><span className={`badge ${p.statut}`}>{STATUTS[p.statut]}</span></div>
      <p className="aide">Échéance : {p.echeance ? new Date(p.echeance).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" }) : "—"} · devoir Moodle n° {p.cmid}</p>

      {moiMembre?.invitation === "invite" && (
        <div className="carte bandeau-action">
          <span>Tu es invité·e dans ce prosit. Tu recevras ton propre CER, à ton nom et à ton style.</span>
          <div><button className="principal" onClick={() => repondre({ invitation: "accepte" })}>Rejoindre</button>
            <button className="secondaire" onClick={() => repondre({ invitation: "refuse" })}>Refuser</button></div>
        </div>
      )}

      {moiMembre?.invitation === "accepte" && (
        <section className="carte">
          <h2>Mon dépôt</h2>
          {moiMembre.fichier && <p><button className="lien" onClick={() => telecharger(moiMembre.fichier!)}>Télécharger mon CER</button></p>}
          {moiMembre.depose_le ? (
            <p><span className="badge depose">Déposé</span> le {new Date(moiMembre.depose_le).toLocaleString("fr-FR")}</p>
          ) : moiMembre.annule ? (
            <div className="ligne-etat"><span className="badge neutre">Annulé</span><span>CERtain ne déposera pas pour toi.</span>
              <button className="secondaire" onClick={() => repondre({ annule: false })}>Réactiver</button></div>
          ) : (
            <div className="ligne-etat"><span>Ton CER sera déposé automatiquement avant l'échéance. Tu es prévenu·e la veille.</span>
              <button className="secondaire" onClick={() => repondre({ annule: true })}>Annuler mon dépôt</button></div>
          )}
          {p.a_relire?.length > 0 && <><h3>Points à relire</h3><ul>{p.a_relire.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
        </section>
      )}

      <section className="carte">
        <h2>Documents du groupe</h2>
        <div className="docs">
          {DOCS.map((d) => (
            <div key={d.id} className="doc">
              <div><b>{d.nom}</b><div className="petit">{d.aide}</div></div>
              {docPresent(d.id) ? (
                <button className="lien" onClick={() => telecharger(`${id}/${docPresent(d.id)}`)}>Ouvrir</button>
              ) : modifiable ? (
                <label className="secondaire bouton">Ajouter
                  <input type="file" hidden accept=".pdf,.docx,.doc,.txt,.md,.odt"
                    onChange={(e) => e.target.files?.[0] && envoyerDoc(d.id, e.target.files[0])} /></label>
              ) : <span className="petit">—</span>}
            </div>
          ))}
        </div>
        {createur && p.statut === "brouillon" && (
          <div className="actions">
            <span className="aide">{docPresent("enonce") ? "L'énoncé suffit pour démarrer ; le retour améliore beaucoup le CER." : "Ajoute au moins l'énoncé."}</span>
            <button className="principal" disabled={!docPresent("enonce")} onClick={lancer}>Lancer la rédaction</button>
          </div>
        )}
      </section>

      <section className="carte">
        <h2>Membres pour ce prosit</h2>
        <ul className="membres">
          {membres.map((m) => (
            <li key={m.etudiant_id}>
              <span>{m.etudiants ? `${m.etudiants.prenoms} ${m.etudiants.nom}`.trim() || "Profil incomplet" : "Membre"}
                {m.etudiant_id === p.createur_id && <span className="petit"> · créateur</span>}</span>
              <span className={`badge ${m.invitation === "accepte" ? (m.annule ? "neutre" : "ok") : "neutre"}`}>
                {m.invitation === "invite" ? "Invité" : m.invitation === "refuse" ? "A refusé" : m.annule ? "Annulé" : m.depose_le ? "Déposé" : "Participe"}</span>
            </li>
          ))}
        </ul>
        {modifiable && (
          <form className="ligne" onSubmit={inviter}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresse@2029.ucac-icam.com" required aria-label="Adresse du camarade" />
            <button className="secondaire">Inviter</button>
          </form>
        )}
      </section>
      {msg && <div className="info">{msg}</div>}
    </div>
  );
}
