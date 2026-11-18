import type { Theme } from "./supabase";

// ── Options proposées (même liste que le skill cer-prosit-groupe, section « Thèmes ») ──────────────

export const POLICES = ["Calibri", "Cambria", "Georgia", "Garamond", "Times New Roman", "Book Antiqua",
  "Arial", "Segoe UI", "Lato", "Century Gothic"];

export const GARDES = [
  { id: "bandeau", nom: "Bandeau", aide: "Bande de couleur pleine largeur" },
  { id: "sobre", nom: "Sobre", aide: "Fond blanc, titre en couleur, filet" },
  { id: "colonne", nom: "Colonne", aide: "Bande verticale à gauche" },
  { id: "centree", nom: "Centrée", aide: "Classique universitaire, tout centré" },
  { id: "cadre", nom: "Cadre", aide: "Page encadrée d'un double filet" },
  { id: "moderne", nom: "Moderne", aide: "Grand numéro, mise en page asymétrique" },
] as const;

export const TITRES = [
  { id: "filet", nom: "Filet", aide: "Titre souligné d'un filet" },
  { id: "numero", nom: "Grand numéro", aide: "Numéro en grand, de couleur" },
  { id: "bande", nom: "Bande", aide: "Titre sur fond teinté" },
  { id: "capitales", nom: "Capitales", aide: "Petites capitales espacées" },
  { id: "simple", nom: "Simple", aide: "Gras, sans décor" },
] as const;

export const NUMEROTATIONS = [
  { id: "romain", nom: "I. 1. 1.1", aide: "Parties en chiffres romains" },
  { id: "decimal", nom: "1. 1.1 1.1.1", aide: "Tout en décimal" },
  { id: "aucune", nom: "Sans numéros", aide: "Titres seuls" },
] as const;

export const TABLEAUX = [
  { id: "raye", nom: "Rayé", aide: "Une ligne sur deux teintée" },
  { id: "grille", nom: "Grille", aide: "Toutes les bordures" },
  { id: "lignes", nom: "Lignes", aide: "Filets horizontaux seulement" },
  { id: "minimal", nom: "Minimal", aide: "En-tête souligné, rien d'autre" },
] as const;

export const ENCADRES = [
  { id: "barre", nom: "Barre", aide: "Barre de couleur à gauche" },
  { id: "fond", nom: "Fond", aide: "Fond teinté" },
  { id: "cadre", nom: "Cadre", aide: "Contour fin" },
] as const;

export const PAGINATIONS = [
  { id: "page_sur", nom: "Page 3 / 10" },
  { id: "numero", nom: "3" },
  { id: "tiret", nom: "— 3 —" },
  { id: "aucune", nom: "Aucune" },
] as const;

export const ENTETES = [
  { id: "complet", nom: "Titre et nom" },
  { id: "titre", nom: "Titre seul" },
  { id: "aucun", nom: "Aucun" },
] as const;

export const MARGES = [
  { id: "etroites", nom: "Étroites", cm: 1.8 },
  { id: "normales", nom: "Normales", cm: 2.2 },
  { id: "larges", nom: "Larges", cm: 2.6 },
] as const;

export const TAILLES = [10.5, 11, 12] as const;
export const INTERLIGNES = [1, 1.15, 1.5] as const;

export const PALETTES = [
  { nom: "Anthracite & pétrole", principale: "2F3437", accent: "0F766E" },
  { nom: "Encre & bordeaux", principale: "1F2430", accent: "9F1239" },
  { nom: "Forêt", principale: "1C2B22", accent: "3F6212" },
  { nom: "Terre cuite", principale: "3B2A23", accent: "B45309" },
  { nom: "Prune", principale: "2E2433", accent: "7E22CE" },
  { nom: "Graphite", principale: "27272A", accent: "52525B" },
  { nom: "Nuit & or", principale: "1E2235", accent: "8A6A12" },
  { nom: "Marine", principale: "13233A", accent: "1D4F91" },
  { nom: "Cacao & rose", principale: "33241F", accent: "BE185D" },
];

export type ThemeComplet = Required<Theme>;

export const DEFAUT: ThemeComplet = {
  police: "Calibri", police_titres: "Calibri", taille: 11, interligne: 1.15,
  couleur_principale: "2F3437", couleur_accent: "0F766E",
  garde: "bandeau", titres: "filet", numerotation: "romain", tableaux: "raye", encadres: "barre",
  sommaire: false, pagination: "page_sur", entete: "complet", marges: "normales",
};

// Préréglages : un clic pour un ensemble cohérent, ensuite tout reste modifiable
export const PRESETS: { nom: string; aide: string; theme: Partial<ThemeComplet> }[] = [
  { nom: "Ingénieur", aide: "La charte d'origine", theme: { ...DEFAUT } },
  { nom: "Académique", aide: "Centré, serif, sommaire", theme: {
    police: "Cambria", police_titres: "Cambria", garde: "centree", titres: "simple", numerotation: "romain",
    tableaux: "grille", encadres: "cadre", sommaire: true, pagination: "tiret", entete: "titre",
    couleur_principale: "1F2430", couleur_accent: "1D4F91", interligne: 1.5, marges: "larges" } },
  { nom: "Moderne", aide: "Grands numéros, sans-serif", theme: {
    police: "Segoe UI", police_titres: "Segoe UI", garde: "moderne", titres: "numero", numerotation: "decimal",
    tableaux: "lignes", encadres: "fond", sommaire: false, pagination: "numero", entete: "complet",
    couleur_principale: "27272A", couleur_accent: "BE185D" } },
  { nom: "Élégant", aide: "Garamond, capitales, cadre", theme: {
    police: "Garamond", police_titres: "Garamond", garde: "cadre", titres: "capitales", numerotation: "romain",
    tableaux: "minimal", encadres: "barre", sommaire: true, pagination: "page_sur", entete: "titre",
    couleur_principale: "1E2235", couleur_accent: "8A6A12", taille: 12 } },
  { nom: "Épuré", aide: "Minimal, beaucoup d'air", theme: {
    police: "Lato", police_titres: "Lato", garde: "sobre", titres: "simple", numerotation: "aucune",
    tableaux: "minimal", encadres: "fond", sommaire: false, pagination: "numero", entete: "aucun",
    couleur_principale: "27272A", couleur_accent: "52525B", marges: "larges" } },
];

// ── Validation (mêmes règles que le skill) ───────────────────────────────────────────────────────

function luminance(hex: string) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const contrasteSurBlanc = (hex: string) => 1.05 / (luminance(hex) + 0.05);
export const couleurValide = (hex: string) => /^[0-9A-Fa-f]{6}$/.test(hex) && contrasteSurBlanc(hex) >= 4.5;
export function eclaircir(hex: string, part = 0.9) {
  return [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * part).toString(16).padStart(2, "0");
  }).join("");
}

const dans = <T extends string | number>(v: unknown, liste: readonly { id: T }[] | readonly T[], def: T): T => {
  const ids = (liste as readonly unknown[]).map((x) => (typeof x === "object" && x ? (x as { id: T }).id : x));
  return ids.includes(v) ? (v as T) : def;
};

export function complet(t: Theme): ThemeComplet {
  return {
    police: dans(t.police, POLICES, DEFAUT.police),
    police_titres: dans(t.police_titres ?? t.police, POLICES, DEFAUT.police_titres),
    taille: dans(t.taille, TAILLES, DEFAUT.taille),
    interligne: dans(t.interligne, INTERLIGNES, DEFAUT.interligne),
    couleur_principale: couleurValide(t.couleur_principale ?? "") ? t.couleur_principale! : DEFAUT.couleur_principale,
    couleur_accent: couleurValide(t.couleur_accent ?? "") ? t.couleur_accent! : DEFAUT.couleur_accent,
    garde: dans(t.garde, GARDES, DEFAUT.garde),
    titres: dans(t.titres, TITRES, DEFAUT.titres),
    numerotation: dans(t.numerotation, NUMEROTATIONS, DEFAUT.numerotation),
    tableaux: dans(t.tableaux, TABLEAUX, DEFAUT.tableaux),
    encadres: dans(t.encadres, ENCADRES, DEFAUT.encadres),
    sommaire: typeof t.sommaire === "boolean" ? t.sommaire : DEFAUT.sommaire,
    pagination: dans(t.pagination, PAGINATIONS, DEFAUT.pagination),
    entete: dans(t.entete, ENTETES, DEFAUT.entete),
    marges: dans(t.marges, MARGES, DEFAUT.marges),
  };
}
