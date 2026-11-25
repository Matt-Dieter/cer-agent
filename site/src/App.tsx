import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Etudiant } from "./supabase";
import Connexion from "./pages/Connexion";
import Prosits from "./pages/Prosits";
import NouveauProsit from "./pages/NouveauProsit";
import PrositDetail from "./pages/PrositDetail";
import Profil from "./pages/Profil";
import Themes from "./Themes";
import Acces from "./pages/Acces";
import { Bandeau, PageAlertes, useAlertes } from "./Alertes";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [moi, setMoi] = useState<Etudiant | null>(null);

  useEffect(() => {
    // Si la lecture de la session traîne (réseau lent ou verrou bloqué), on montre la page de connexion au lieu d'attendre sans fin
    const delai = setTimeout(() => setSession((s) => (s === undefined ? null : s)), 5000);
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { clearTimeout(delai); data.subscription.unsubscribe(); };
  }, []);

  const recharger = async () => {
    if (!session) return setMoi(null);
    const { data } = await supabase.from("etudiants").select("*").eq("id", session.user.id).single();
    setMoi(data as Etudiant | null);
  };
  useEffect(() => { recharger(); }, [session?.user.id]);

  if (session === undefined) return <div className="chargement">un instant…</div>;
  if (!session) return <Connexion />;
  if (!moi) return <div className="chargement">ouverture de ton espace…</div>;
  if (!moi.actif) return (
    <div className="chargement" style={{ textAlign: "center", padding: "2rem" }}>
      <div><h2>Ton accès à CERtain a été retiré.</h2>
        <p className="doux">Demande à l'administrateur de te réautoriser.</p>
        <button className="lien" onClick={() => supabase.auth.signOut()}>Se déconnecter</button></div>
    </div>
  );

  return <Connecte moi={moi} recharger={recharger} />;
}

function Connecte({ moi, recharger }: { moi: Etudiant; recharger: () => void }) {
  const al = useAlertes(moi.id);
  const incomplet = !moi.nom || !moi.prenoms || !moi.moodle_relie;

  return (
    <div className="app">
      <header className="barre">
        <Link to="/" className="marque">CER<i>tain</i></Link>
        <nav>
          <NavLink to="/" end>Prosits</NavLink>
          <NavLink to="/alertes">Alertes{al.nonLues > 0 && <span className="compteur" aria-label={`${al.nonLues} non lues`}>{al.nonLues}</span>}</NavLink>
          <NavLink to="/profil">Profil{incomplet && <span className="point" aria-label="à compléter" />}</NavLink>
          {moi.role === "admin" && <NavLink to="/acces">Accès</NavLink>}
          <button onClick={() => supabase.auth.signOut()}>Sortir</button>
          <Themes />
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={incomplet ? <Navigate to="/profil" replace /> : <Prosits moi={moi} />} />
          <Route path="/alertes" element={<PageAlertes liste={al.liste} nonLues={al.nonLues} marquerLue={al.marquerLue} toutLire={al.toutLire} />} />
          <Route path="/profil" element={<Profil moi={moi} onChange={recharger} />} />
          <Route path="/prosits/nouveau" element={<NouveauProsit moi={moi} />} />
          <Route path="/prosits/:id" element={<PrositDetail moi={moi} />} />
          {moi.role === "admin" && <Route path="/acces" element={<Acces />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Bandeau n={al.recue} fermer={al.fermer} />
      <footer className="pied">
        <span>CERtain — projet étudiant, Ucac-Icam</span>
        <span>Ton mot de passe Moodle n'est jamais conservé</span>
      </footer>
    </div>
  );
}
