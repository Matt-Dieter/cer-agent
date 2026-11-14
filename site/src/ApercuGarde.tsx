import type { Theme } from "./supabase";
import { complet, eclaircir } from "./theme";

// Aperçu fidèle (à l'échelle) de la page de garde du CER avec le thème choisi
export default function ApercuGarde({ theme, nom, groupe, annee }: {
  theme: Theme; nom: string; groupe: string; annee: string;
}) {
  const t = complet(theme);
  const p = `#${t.couleur_principale}`, a = `#${t.couleur_accent}`, clair = `#${eclaircir(t.couleur_accent, 0.55)}`;
  const titre = (
    <>
      <div style={{ fontSize: 7, letterSpacing: 1.5, color: t.garde === "bandeau" ? clair : a, fontWeight: 700 }}>COMPTE RENDU</div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>CER PROSIT 3</div>
      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Analyse et modélisation des exigences</div>
    </>
  );
  return (
    <div className="apercu" style={{ fontFamily: `"${t.police}", system-ui, sans-serif` }} aria-label="Aperçu de la page de garde">
      {t.garde === "colonne" && <div style={{ position: "absolute", inset: "0 auto 0 0", width: 18, background: a }} />}
      <div style={{ padding: t.garde === "colonne" ? "14px 14px 14px 32px" : 14, height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 7, color: "#6B7275", borderBottom: "1px solid #D5DADB", paddingBottom: 4 }}>Ucac-Icam · Année académique {annee}</div>
        {t.garde === "bandeau" ? (
          <div style={{ background: p, color: "#fff", margin: "18px -14px 0", padding: "16px 14px" }}>{titre}</div>
        ) : (
          <div style={{ color: p, marginTop: 26, paddingBottom: 10, borderBottom: `2px solid ${a}` }}>{titre}</div>
        )}
        <div style={{ marginTop: "auto", fontSize: 7.5 }}>
          {[["Rédigé par", nom || "Prénom NOM"], ["Groupe", groupe || "Groupe"], ["Établissement", "Ucac-Icam"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8, borderTop: "1px solid #D5DADB", padding: "3px 0" }}>
              <span style={{ color: "#6B7275", width: 64 }}>{k}</span><b style={{ color: "#262626" }}>{v}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
