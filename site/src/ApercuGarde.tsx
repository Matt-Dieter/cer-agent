import type { CSSProperties, ReactNode } from "react";
import type { Theme } from "./supabase";
import { complet, eclaircir, type ThemeComplet } from "./theme";

// Aperçu à l'échelle d'une page A4 : garde (6 formes) ou page de corps (titres, numéros, tableaux…)
type Props = { theme: Theme; nom: string; annee: string; page?: "garde" | "corps" | "sommaire" };

export default function ApercuGarde({ theme, nom, annee, page = "garde" }: Props) {
  const t = complet(theme);
  const style: CSSProperties = { fontFamily: `"${t.police}", Calibri, sans-serif` };
  return (
    <div className="apercu" style={style} aria-label={`Aperçu : ${page}`}>
      {page === "garde" ? <Garde t={t} nom={nom} annee={annee} /> : page === "sommaire" ? <Sommaire t={t} /> : <Corps t={t} nom={nom} />}
    </div>
  );
}

const coul = (t: ThemeComplet) => ({
  p: `#${t.couleur_principale}`, a: `#${t.couleur_accent}`,
  pale: `#${eclaircir(t.couleur_accent, 0.88)}`, clair: `#${eclaircir(t.couleur_accent, 0.55)}`,
});
const marge = (t: ThemeComplet) => ({ etroites: 10, normales: 13, larges: 17 }[t.marges]);

function Infos({ t, nom, annee, centre = false }: { t: ThemeComplet; nom: string; annee: string; centre?: boolean }) {
  const lignes = [["Rédigé par", nom || "Prénom NOM"], ["Année académique", annee], ["Établissement", "Ucac-Icam"]];
  if (centre) return (
    <div style={{ textAlign: "center", fontSize: 7, lineHeight: 1.7, color: "#262626" }}>
      {lignes.map(([k, v]) => <div key={k}><span style={{ color: "#6B7275" }}>{k} : </span><b>{v}</b></div>)}
    </div>
  );
  return (
    <div style={{ fontSize: 6.5 }}>
      {lignes.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 8, borderTop: "1px solid #D5DADB", padding: "3px 0" }}>
          <span style={{ color: "#6B7275", width: 60 }}>{k}</span><b style={{ color: "#262626" }}>{v}</b>
        </div>
      ))}
    </div>
  );
}

function Garde({ t, nom, annee }: { t: ThemeComplet; nom: string; annee: string }) {
  const c = coul(t), m = marge(t);
  const titreF: CSSProperties = { fontFamily: `"${t.police_titres}", sans-serif` };
  const haut = <div style={{ fontSize: 6, color: "#6B7275", borderBottom: "1px solid #D5DADB", paddingBottom: 3 }}>Ucac-Icam · Année académique {annee}</div>;
  const bloc = (couleurTitre: string, etiquette: string, align: "left" | "center" = "left") => (
    <div style={{ ...titreF, textAlign: align }}>
      <div style={{ fontSize: 6.5, letterSpacing: 1.5, color: etiquette, fontWeight: 700 }}>COMPTE RENDU</div>
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: couleurTitre }}>CER PROSIT 3</div>
      <div style={{ fontSize: 9.5, fontWeight: 700, marginTop: 4, color: couleurTitre }}>Analyse et modélisation des exigences</div>
    </div>
  );
  const page = (enfants: ReactNode, extra: CSSProperties = {}) => (
    <div style={{ padding: m, height: "100%", display: "flex", flexDirection: "column", position: "relative", ...extra }}>{enfants}</div>
  );

  switch (t.garde) {
    case "bandeau": return page(<>
      {haut}
      <div style={{ background: c.p, margin: `16px -${m}px 0`, padding: `14px ${m}px` }}>{bloc("#fff", c.clair)}</div>
      <div style={{ marginTop: "auto" }}><Infos t={t} nom={nom} annee={annee} /></div>
    </>);
    case "sobre": return page(<>
      {haut}
      <div style={{ marginTop: 26, paddingBottom: 9, borderBottom: `2px solid ${c.a}` }}>{bloc(c.p, c.a)}</div>
      <div style={{ marginTop: "auto" }}><Infos t={t} nom={nom} annee={annee} /></div>
    </>);
    case "colonne": return (<>
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: 16, background: c.a }} />
      {page(<>
        {haut}
        <div style={{ marginTop: 26 }}>{bloc(c.p, c.a)}</div>
        <div style={{ marginTop: "auto" }}><Infos t={t} nom={nom} annee={annee} /></div>
      </>, { paddingLeft: m + 16 })}
    </>);
    case "centree": return page(<>
      <div style={{ textAlign: "center", fontSize: 7, fontWeight: 700, color: c.p, letterSpacing: 1 }}>UCAC-ICAM</div>
      <div style={{ textAlign: "center", fontSize: 5.5, color: "#6B7275" }}>Année académique {annee}</div>
      <div style={{ margin: "auto 0", padding: "12px 0", borderTop: `1px solid ${c.a}`, borderBottom: `1px solid ${c.a}` }}>{bloc(c.p, c.a, "center")}</div>
      <Infos t={t} nom={nom} annee={annee} centre />
    </>);
    case "cadre": return page(<>
      <div style={{ position: "absolute", inset: m / 2, border: `1.5px solid ${c.p}`, outline: `0.5px solid ${c.a}`, outlineOffset: -4 }} />
      <div style={{ padding: 8, height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ textAlign: "center", fontSize: 6, color: "#6B7275" }}>Ucac-Icam · {annee}</div>
        <div style={{ margin: "auto 0" }}>{bloc(c.p, c.a, "center")}</div>
        <Infos t={t} nom={nom} annee={annee} centre />
      </div>
    </>);
    case "moderne": return page(<>
      {haut}
      <div style={{ ...titreF, fontSize: 70, fontWeight: 800, color: c.pale, lineHeight: 1, marginTop: 16, letterSpacing: -3 }}>03</div>
      <div style={{ marginTop: -18, paddingLeft: 10, borderLeft: `3px solid ${c.a}` }}>{bloc(c.p, c.a)}</div>
      <div style={{ marginTop: "auto" }}><Infos t={t} nom={nom} annee={annee} /></div>
    </>);
  }
}

const numero = (t: ThemeComplet, partie: number, sous?: number) => {
  if (t.numerotation === "aucune") return "";
  if (sous === undefined) return t.numerotation === "romain" ? ["I", "II", "III"][partie - 1] + ". " : `${partie}. `;
  return `${partie}.${sous} `;
};

function Titre1({ t, partie, children }: { t: ThemeComplet; partie: number; children: ReactNode }) {
  const c = coul(t), f: CSSProperties = { fontFamily: `"${t.police_titres}", sans-serif`, fontWeight: 700, color: c.p };
  const n = numero(t, partie);
  switch (t.titres) {
    case "filet": return <div style={{ ...f, fontSize: 10, borderBottom: `1.5px solid ${c.a}`, paddingBottom: 2, marginBottom: 5 }}>{n}{children}</div>;
    case "numero": return <div style={{ ...f, fontSize: 10, display: "flex", alignItems: "baseline", gap: 5, marginBottom: 5 }}>
      {n && <span style={{ fontSize: 18, color: c.a, fontWeight: 800 }}>{n.replace(/\.\s$/, "")}</span>}{children}</div>;
    case "bande": return <div style={{ ...f, fontSize: 9.5, background: c.pale, padding: "3px 5px", marginBottom: 5 }}>{n}{children}</div>;
    case "capitales": return <div style={{ ...f, fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 5 }}>{n}{children}</div>;
    default: return <div style={{ ...f, fontSize: 10, marginBottom: 5 }}>{n}{children}</div>;
  }
}

function Lignes({ n, t }: { n: number; t: ThemeComplet }) {
  const h = { 1: 3.2, 1.15: 3.8, 1.5: 4.8 }[t.interligne as 1 | 1.15 | 1.5] ?? 3.8;
  return <div style={{ display: "grid", gap: h - 1.6, marginBottom: 6 }}>
    {Array.from({ length: n }, (_, i) => <div key={i} style={{ height: 1.6, background: "#C9CDCF", width: i === n - 1 ? "62%" : "100%" }} />)}
  </div>;
}

function Corps({ t, nom }: { t: ThemeComplet; nom: string }) {
  const c = coul(t), m = marge(t);
  const bord = "1px solid #D5DADB";
  const cellule = (l: number, col: number): CSSProperties => ({
    padding: "2px 3px", fontSize: 5.5,
    border: t.tableaux === "grille" ? bord : undefined,
    borderBottom: t.tableaux === "lignes" ? bord : undefined,
    background: t.tableaux === "raye" && l % 2 === 1 ? "#F4F6F6" : undefined,
    fontWeight: col === 0 ? 700 : 400,
  });
  const entete: CSSProperties = t.tableaux === "minimal"
    ? { borderBottom: `1.5px solid ${c.p}`, color: c.p, fontWeight: 700, fontSize: 5.5, padding: "2px 3px" }
    : { background: c.p, color: "#fff", fontWeight: 700, fontSize: 5.5, padding: "2px 3px" };
  const encadre: CSSProperties = t.encadres === "barre" ? { borderLeft: `3px solid ${c.a}`, background: c.pale, padding: "4px 6px" }
    : t.encadres === "fond" ? { background: c.pale, padding: "5px 7px", borderRadius: 2 }
    : { border: `1px solid ${c.a}`, padding: "4px 6px" };
  const pied = { page_sur: "Page 3 / 10", numero: "3", tiret: "— 3 —", aucune: "" }[t.pagination];
  const fs = { 10.5: 0.95, 11: 1, 12: 1.08 }[t.taille as 10.5 | 11 | 12] ?? 1;

  return (
    <div style={{ padding: m, height: "100%", display: "flex", flexDirection: "column", transform: `scale(${fs})`, transformOrigin: "top left", width: `${100 / fs}%` }}>
      {t.entete !== "aucun" && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 5.5, borderBottom: bord, paddingBottom: 2, marginBottom: 9 }}>
          <b>CER Prosit 3 — Analyse des exigences</b>{t.entete === "complet" && <span>{nom || "Prénom NOM"}</span>}
        </div>
      )}
      <Titre1 t={t} partie={2}>Réalisation du plan d'action</Titre1>
      <Lignes n={3} t={t} />
      <div style={{ fontFamily: `"${t.police_titres}", sans-serif`, fontSize: 7.5, fontWeight: 700, color: c.a, marginBottom: 4 }}>
        {numero(t, 2, 1)}Identifier les parties prenantes
      </div>
      <Lignes n={2} t={t} />
      <div style={{ fontSize: 5.5, marginBottom: 2 }}><b style={{ color: c.a }}>Tableau 1</b> <i style={{ color: "#6B7275" }}>– Parties prenantes</i></div>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 7 }}>
        <thead><tr><th style={entete}>Acteur</th><th style={entete}>Rôle</th><th style={entete}>Attente</th></tr></thead>
        <tbody>{[0, 1, 2].map((l) => <tr key={l}>{[0, 1, 2].map((col) => <td key={col} style={cellule(l, col)}>{["ANBE", "MENODJI", "Étudiants"][l] && col === 0 ? ["ANBE", "MENODJI", "Étudiants"][l] : "· · ·"}</td>)}</tr>)}</tbody>
      </table>
      <div style={{ ...encadre, fontSize: 6, marginBottom: 7 }}>
        <div style={{ fontSize: 5, letterSpacing: 1, color: c.a, fontWeight: 700 }}>PROBLÉMATIQUE</div>
        <i>Comment recueillir et modéliser les exigences de façon justifiée ?</i>
      </div>
      <Lignes n={3} t={t} />
      <div style={{ marginTop: "auto", textAlign: "center", fontSize: 5.5, color: "#6B7275" }}>{pied}</div>
    </div>
  );
}

function Sommaire({ t }: { t: ThemeComplet }) {
  const c = coul(t), m = marge(t);
  const entrees: [string, string, number][] = [
    [numero(t, 1), "Rappel du prosit aller", 2], [numero(t, 2), "Réalisation du plan d'action", 4],
    [numero(t, 3), "Validation des pistes", 8], ["", "Conclusion", 9], ["", "Bibliographie", 10],
  ];
  if (!t.sommaire) return <div style={{ padding: m, height: "100%", display: "grid", placeItems: "center", textAlign: "center", fontSize: 7, color: "#6B7275" }}>
    Sans sommaire :<br />le rappel du prosit aller commence juste après la garde.</div>;
  return (
    <div style={{ padding: m, height: "100%" }}>
      <div style={{ fontFamily: `"${t.police_titres}", sans-serif`, fontSize: 11, fontWeight: 700, color: c.p, marginBottom: 10, borderBottom: `1.5px solid ${c.a}`, paddingBottom: 3 }}>Sommaire</div>
      {entrees.map(([n, l, pg]) => (
        <div key={l} style={{ display: "flex", fontSize: 6.5, marginBottom: 5, alignItems: "baseline" }}>
          <span>{n}{l}</span><span style={{ flex: 1, borderBottom: "1px dotted #9AA", margin: "0 3px" }} /><span>{pg}</span>
        </div>
      ))}
    </div>
  );
}
