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

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [moi, setMoi] = useState<Etudiant | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
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

  const incomplet = !moi.nom || !moi.prenoms || !moi.moodle_relie;

  return (
    <div className="app">
      <header className="barre">
        <Link to="/" className="marque">CER<i>tain</i></Link>
        <nav>
          <NavLink to="/" end>Prosits</NavLink>
          <NavLink to="/profil">Profil{incomplet && <span className="point" aria-label="à compléter" />}</NavLink>
          <button onClick={() => supabase.auth.signOut()}>Sortir</button>
          <Themes />
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={incomplet ? <Navigate to="/profil" replace /> : <Prosits moi={moi} />} />
          <Route path="/profil" element={<Profil moi={moi} onChange={recharger} />} />
          <Route path="/prosits/nouveau" element={<NouveauProsit moi={moi} />} />
          <Route path="/prosits/:id" element={<PrositDetail moi={moi} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="pied">
        <span>CERtain — projet étudiant, Ucac-Icam</span>
        <span>Ton mot de passe Moodle n'est jamais conservé</span>
      </footer>
    </div>
  );
}
