import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase, STATUTS, TON, dateCourte, delai, type Etudiant, type Membre, type Prosit } from "../supabase";

type MembreNom = Membre & { etudiants: { nom: string; prenoms: string } | null };
const DOCS = [
  { id: "enonce", nom: "Énoncé", aide: "Texte du prosit et objectifs" },
  { id: "aller", nom: "Prosit aller", aide: "facultatif · mots clés, problématique, pistes, plan" },
  { id: "retour", nom: "Prosit retour", aide: "facultatif · verdicts et corrections du tuteur" },
] as const;
const ETAPES = ["Importé", "Rédaction", "Prêt", "Déposé"];
const ETAPE: Record<string, number> = { brouillon: 0, en_attente: 1, en_redaction: 1, erreur: 1, a_relire: 2, pret: 2, depose: 3 };

export default function PrositDetail({ moi }: { moi: Etudiant }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [suppr, setSuppr] = useState<{ ouvert: boolean; moodle: boolean; envoi: boolean }>({ ouvert: false, moodle: true, envoi: false });
  const [p, setP] = useState<Prosit | null>(null);
  const [membres, setMembres] = useState<MembreNom[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [perso, setPerso] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = async () => {
    const [{ data: pr }, { data: mb }, { data: fichiers }] = await Promise.all([
      supabase.from("prosits").select("*").eq("id", id).single(),
      supabase.from("prosit_membres").select("*, etudiants(nom, prenoms)").eq("prosit_id", id),
      supabase.storage.from("prosits").list(id),
    ]);
    setP(pr as Prosit); setMembres((mb ?? []) as MembreNom[]); setDocs((fichiers ?? []).map((f) => f.name));
    const { data: mes } = await supabase.storage.from("prosits").list(`${id}/perso/${moi.id}`);
    setPerso((mes ?? []).map((f) => f.name));
  };
  useEffect(() => { charger(); }, [id]);

  if (!p) return <div className="chargement">ouverture du prosit…</div>;
  const moiM = membres.find((m) => m.etudiant_id === moi.id);
  const createur = p.createur_id === moi.id;
  const modifiable = createur && ["brouillon", "en_attente"].includes(p.statut);  // invitations et changement de numéro : créateur seulement
  const doc = (d: string) => docs.find((n) => n.startsWith(d + "."));
  const ressources = docs.filter((n) => n.startsWith("ressource_"));
  const etape = ETAPE[p.statut] ?? 0;

  const ouvrir = async (nom: string) => {
    const { data } = await supabase.storage.from("prosits").createSignedUrl(`${id}/${nom}`, 120);
    if (data) window.open(data.signedUrl, "_blank");
  };
  const ouvrirChemin = async (chemin: string) => {
    const { data } = await supabase.storage.from("prosits").createSignedUrl(chemin, 120);
    if (data) window.open(data.signedUrl, "_blank");
  };
  const envoyerDoc = async (d: string, f: File, personnel = false) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "txt";
    const dossier = personnel ? `${id}/perso/${moi.id}` : `${id}`;
    // Remplace l'ancienne version, quel que soit son format
    const anciens = (personnel ? perso : docs).filter((n) => n.startsWith(d + ".") && n !== `${d}.${ext}`);
    if (anciens.length) await supabase.storage.from("prosits").remove(anciens.map((n) => `${dossier}/${n}`));
    const { error } = await supabase.storage.from("prosits").upload(`${dossier}/${d}.${ext}`, f, { upsert: true });
    setMsg(error ? "Envoi refusé. Réessaie avec un fichier PDF, Word, PowerPoint ou texte." : personnel ? "Ton document perso est enregistré : il servira à ton CER." : "Document du groupe enregistré.");
    charger();
  };
  const relancer = async () => {
    if (!confirm("Refaire la rédaction avec les documents actuels ? Elle repartira au prochain passage (12h43 ou 21h43) et ton CER sera redéposé avec la nouvelle version.")) return;
    const { error } = await supabase.rpc("relancer_redaction", { p_prosit: id });
    setMsg(error ? "Impossible de relancer pour l'instant." : "Rédaction relancée : elle partira au prochain passage."); charger();
  };
  const inviter = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    const { data } = await supabase.rpc("trouver_etudiant", { p_email: email });
    const c = (data ?? [])[0];
    if (!c) return setMsg("Personne n'est inscrit avec cette adresse. Envoie-lui le lien du site.");
    const { error } = await supabase.from("prosit_membres").insert({ prosit_id: id, etudiant_id: c.id });
    setMsg(error ? "Déjà membre, ou invitation impossible." : `${c.prenoms || email} est invité·e.`); setEmail(""); charger();
  };
  const remplacer = async (f: File) => {
    setEnvoi(true); setMsg("");
    const form = new FormData(); form.append("prosit", id!); form.append("fichier", f);
    const { error } = await supabase.functions.invoke("remplacer-cer", { body: form });
    setEnvoi(false);
    if (error) {
      const corps = await (error as { context?: Response }).context?.json?.().catch(() => null);
      setMsg(corps?.erreur ?? "Le remplacement n'est pas passé.");
    } else setMsg("Version corrigée reçue : elle part sur Moodle dans la minute.");
    charger();
  };
  const supprimer = async () => {
    setSuppr({ ...suppr, envoi: true });
    const { data, error } = await supabase.functions.invoke("supprimer-depot", { body: { prosit: id, retirer_moodle: suppr.moodle } });
    if (error) { setSuppr({ ...suppr, envoi: false }); setMsg("La suppression n'est pas passée. Réessaie."); return; }
    sessionStorage.setItem("certain-message", `Dépôt supprimé.${data?.moodle && data.moodle !== "non demandé" ? " " + data.moodle + "." : ""} CERtain ne le recréera pas.`);
    nav("/");
  };
  const repondre = async (champs: Partial<Membre>) => {
    await supabase.from("prosit_membres").update(champs).eq("prosit_id", id).eq("etudiant_id", moi.id); charger();
  };
  const action = async (rpc: "lancer" | "valider") => {
    if (rpc === "lancer") {
      const { error } = await supabase.rpc("lancer_redaction", { p_prosit: id });
      if (error) setMsg(error.message.includes("Crédits") ? "Crédits épuisés : recharge pour lancer la rédaction." : "Impossible de lancer pour l'instant.");
    }
    else await supabase.rpc("valider_prosit", { p_prosit: id });
    charger();
  };

  return (
    <div className="page">
      <Link to="/" className="mono" style={{ textDecoration: "none" }}>← Tes prosits</Link>
      <div className="entete" style={{ marginTop: "1.4rem" }}>
        <div>
          <span className="meta">{p.cours}{p.numero ? ` · Prosit ${p.numero}` : ""}{p.groupe ? ` · ${p.groupe}` : ""}</span>
          <h1>{p.notion}</h1>
        </div>
        <div className="echeance mono">
          À rendre {dateCourte(p.echeance)}{p.statut !== "depose" && delai(p.echeance) ? <b> · {delai(p.echeance)}</b> : null}
        </div>
      </div>

      <ol className="etapes" aria-label="Avancement">
        {ETAPES.map((e, i) => (
          <li key={e} className={i < etape || (i === etape && p.statut === "depose") ? "fait" : i === etape ? "encours" : ""}>{e}</li>
        ))}
      </ol>
      <p style={{ marginTop: "1rem" }}><span className={`statut ${TON[p.statut]}`}>{STATUTS[p.statut]}</span></p>

      {moiM?.invitation === "invite" && (
        <div className="encart">
          <p>On t'invite dans ce prosit. Tu recevras ta propre version du CER, à ton nom et dans ton style.</p>
          <div className="actions" style={{ margin: 0 }}>
            <button className="btn" onClick={() => repondre({ invitation: "accepte" })}>Rejoindre</button>
            <button className="lien" onClick={() => repondre({ invitation: "refuse" })}>Refuser</button>
          </div>
        </div>
      )}
      {(p.statut === "a_relire" || (createur && p.statut === "erreur")) && (
        <div className="encart">
          <p>{p.statut === "a_relire" ? "Les CER partent sur Moodle. Quelques points sont à relire plus bas : corrige si besoin et remplace ta version." : "La rédaction n'a pas abouti. Vérifie les documents, puis relance."}</p>
          {p.statut === "erreur" && <button className="btn" onClick={() => action("valider")}>Relancer</button>}
        </div>
      )}
      {moiM?.invitation === "accepte" && p.statut === "brouillon" && (
        <div className="encart">
          <p>{doc("enonce") ? "La rédaction démarre seule la veille de l'échéance, avec ou sans prosit aller. Pressé ? Lance-la maintenant : elle partira au prochain passage (12h43 ou 21h43), puis le CER sera déposé aussitôt. Tu peux ajouter l'aller et le retour avant si tu les as, ce n'est pas obligatoire." : "Ajoute au moins l'énoncé pour que la rédaction puisse démarrer."}</p>
          <button className="btn" disabled={!doc("enonce")} onClick={() => action("lancer")}>Rédiger maintenant</button>
        </div>
      )}

      {moiM?.invitation === "accepte" && (
        <section className="bloc">
          <header><span className="meta">01</span><h2>Ton dépôt</h2></header>
          <div>
            {moiM.depose_le ? (
              <p>Déposé sur Moodle le <span className="mono" style={{ color: "var(--encre)" }}>{dateCourte(moiM.depose_le)}</span>.</p>
            ) : moiM.annule ? (
              <p>Tu as annulé : CERtain ne déposera rien pour toi. <button className="lien" onClick={() => repondre({ annule: false })}>Réactiver</button></p>
            ) : (
              <p>Ton CER part seul sur Moodle dès qu'il est rédigé. Tu pourras le relire et le remplacer ensuite. <button className="lien" onClick={() => repondre({ annule: true })}>Ne pas déposer pour moi</button></p>
            )}
            {moiM.depot_statut && !moiM.depose_le && <p className="mono">{moiM.depot_statut}</p>}
            {moiM.fichier && (
              <div className="actions">
                <button className="btn clair" onClick={() => ouvrirChemin(moiM.fichier!)}>Télécharger mon CER</button>
                <label className="btn clair" style={{ flexDirection: "row", color: "var(--encre)", fontSize: ".9rem" }}>
                  {envoi ? "Envoi…" : "Remplacer par ma version corrigée"}
                  <input type="file" hidden accept=".docx" disabled={envoi} onChange={(e) => e.target.files?.[0] && remplacer(e.target.files[0])} />
                </label>
              </div>
            )}
            {moiM.fichier && <p className="doux" style={{ fontSize: ".85rem" }}>Relis, corrige dans Word, puis renvoie le fichier : il remplace aussitôt ton dépôt sur Moodle.</p>}
            {p.a_relire?.length > 0 && <>
              <h3>Points à relire</h3>
              <ul className="lignes">{p.a_relire.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </>}
          </div>
        </section>
      )}

      <section className="bloc">
        <header><span className="meta">02</span><h2>Documents</h2><p>{p.source === "moodle" ? "L'énoncé et les ressources viennent de Moodle. " : ""}Tout membre peut ajouter ou remplacer un document du groupe. Le prosit aller et le retour sont facultatifs : sans eux, CERtain les reconstruit à partir de l'énoncé. Avec eux, le CER est plus fidèle à ce que vous avez décidé.</p></header>
        <div>
          <ul className="lignes">
            {DOCS.map((d) => (
              <li key={d.id}>
                <span>{d.nom} <span className="doux" style={{ fontSize: ".85rem" }}>— {d.aide}</span></span>
                <span style={{ display: "flex", gap: "1rem" }}>
                  {doc(d.id) && <button className="lien" onClick={() => ouvrir(doc(d.id)!)}>Ouvrir</button>}
                  {moiM?.invitation === "accepte" ? (
                    <label className="lien" style={{ flexDirection: "row", fontSize: "inherit", color: "inherit" }}>{doc(d.id) ? "Remplacer" : "Ajouter"}
                      <input type="file" hidden accept=".pdf,.docx,.doc,.txt,.md,.odt,.pptx,.ppt" onChange={(e) => e.target.files?.[0] && envoyerDoc(d.id, e.target.files[0])} /></label>
                  ) : !doc(d.id) ? <span className="mono">—</span> : null}
                </span>
              </li>
            ))}
            {ressources.map((r) => (
              <li key={r}>
                <span>{r.replace(/^ressource_/, "").replace(/_/g, " ")} <span className="doux" style={{ fontSize: ".85rem" }}>— ressource du cours</span></span>
                <button className="lien" onClick={() => ouvrir(r)}>Ouvrir</button>
              </li>
            ))}
          </ul>

          {moiM?.invitation === "accepte" && (
            <>
              <h3>Mes documents (facultatif, pour mon CER seulement)</h3>
              <p className="doux" style={{ fontSize: ".88rem", margin: ".2rem 0 .8rem" }}>Ton propre prosit aller ou retour, s'il diffère de celui du groupe. Il remplace celui du groupe pour ta version, et personne d'autre ne le voit.</p>
              <ul className="lignes">
                {(["aller", "retour"] as const).map((d) => {
                  const f = perso.find((n) => n.startsWith(d + "."));
                  return (
                    <li key={d}>
                      <span>{d === "aller" ? "Mon prosit aller" : "Mon prosit retour"}</span>
                      <span style={{ display: "flex", gap: "1rem" }}>
                        {f && <button className="lien" onClick={() => ouvrir(`perso/${moi.id}/${f}`)}>Ouvrir</button>}
                        <label className="lien" style={{ flexDirection: "row", fontSize: "inherit", color: "inherit" }}>{f ? "Remplacer" : "Ajouter"}
                          <input type="file" hidden accept=".pdf,.docx,.doc,.txt,.md,.odt,.pptx,.ppt" onChange={(e) => e.target.files?.[0] && envoyerDoc(d, e.target.files[0], true)} /></label>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {moiM?.invitation === "accepte" && ["a_relire", "pret", "depose", "erreur"].includes(p.statut) && (
            <div className="actions">
              <button className="btn clair" onClick={relancer}>Refaire la rédaction avec ces documents</button>
              <span className="small">Utile après avoir ajouté ou remplacé le prosit aller ou le retour.</span>
            </div>
          )}
        </div>
      </section>

      <section className="bloc">
        <header><span className="meta">03</span><h2>Le groupe</h2><p>Chacun reçoit sa version. Les camarades du même groupe qui relient Moodle sont ajoutés seuls.</p></header>
        <div>
          <ul className="lignes">
            {membres.map((m) => (
              <li key={m.etudiant_id}>
                <span>{m.etudiants ? `${m.etudiants.prenoms} ${m.etudiants.nom}`.trim() || "Profil incomplet" : "Membre"}
                  {m.etudiant_id === moi.id && <span className="doux"> (toi)</span>}</span>
                <span className={`statut ${m.depose_le ? "ok" : m.invitation === "accepte" && !m.annule ? "vif" : ""}`}>
                  {m.invitation === "invite" ? "invité" : m.invitation === "refuse" ? "a refusé" : m.annule ? "annulé" : m.depose_le ? "déposé" : "participe"}</span>
              </li>
            ))}
          </ul>
          {modifiable && (
            <form onSubmit={inviter} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginTop: "1.2rem" }}>
              <label style={{ flex: 1 }}>Inviter par e-mail
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@2029.ucac-icam.com" required />
              </label>
              <button className="btn clair">Inviter</button>
            </form>
          )}
        </div>
      </section>
      {moiM && (
        <section className="bloc">
          <header><span className="meta">04</span><h2>Supprimer</h2><p>Retire ce dépôt de ton espace. CERtain ne le recréera pas, même s'il revient sur Moodle.</p></header>
          <div>
            {!suppr.ouvert ? (
              <button className="lien" style={{ color: "var(--alerte)" }} onClick={() => setSuppr({ ...suppr, ouvert: true })}>Supprimer ce dépôt…</button>
            ) : (
              <div className="encart" style={{ marginTop: 0, display: "grid", gap: "1rem" }}>
                <p><b>Supprimer « {p.notion} » ?</b> {membres.filter((m) => m.invitation === "accepte").length > 1 ? "Tu quittes ce prosit ; tes camarades gardent le leur." : "Le prosit et ses documents seront effacés."}</p>
                {moiM.depose_le && (
                  <label className="interrupteur">
                    <input type="checkbox" checked={suppr.moodle} onChange={(e) => setSuppr({ ...suppr, moodle: e.target.checked })} />
                    Vider aussi ma remise sur Moodle (si le devoir est encore ouvert)
                  </label>
                )}
                <div className="actions" style={{ marginTop: 0 }}>
                  <button className="btn" style={{ background: "var(--alerte)", borderColor: "var(--alerte)" }} disabled={suppr.envoi} onClick={supprimer}>
                    {suppr.envoi ? "Suppression…" : "Supprimer définitivement"}</button>
                  <button className="lien" onClick={() => setSuppr({ ...suppr, ouvert: false })}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      {msg && <div className="message">{msg}</div>}
    </div>
  );
}
