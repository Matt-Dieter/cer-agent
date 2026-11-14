import type { Theme } from "./supabase";

export const POLICES = ["Calibri", "Cambria", "Georgia", "Arial", "Segoe UI", "Garamond"];
export const GARDES = [
  { id: "bandeau", nom: "Bandeau" },
  { id: "sobre", nom: "Sobre" },
  { id: "colonne", nom: "Colonne" },
] as const;
export const PALETTES = [
  { nom: "Anthracite & pétrole", principale: "2F3437", accent: "0F766E" },
  { nom: "Encre & bordeaux", principale: "1F2430", accent: "9F1239" },
  { nom: "Forêt", principale: "1C2B22", accent: "3F6212" },
  { nom: "Terre cuite", principale: "3B2A23", accent: "B45309" },
  { nom: "Prune", principale: "2E2433", accent: "7E22CE" },
  { nom: "Graphite", principale: "27272A", accent: "52525B" },
];
export const DEFAUT: Required<Theme> = {
  police: "Calibri", couleur_principale: "2F3437", couleur_accent: "0F766E", garde: "bandeau",
};

// Même règle que le skill : contraste >= 4,5:1 sur fond blanc
function luminance(hex: string) {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrasteSurBlanc(hex: string) {
  return 1.05 / (luminance(hex) + 0.05);
}
export function couleurValide(hex: string) {
  return /^[0-9A-Fa-f]{6}$/.test(hex) && contrasteSurBlanc(hex) >= 4.5;
}
export function eclaircir(hex: string, part = 0.9) {
  return [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * part).toString(16).padStart(2, "0");
  }).join("");
}
export function complet(t: Theme): Required<Theme> {
  return {
    police: POLICES.includes(t.police ?? "") ? t.police! : DEFAUT.police,
    couleur_principale: couleurValide(t.couleur_principale ?? "") ? t.couleur_principale! : DEFAUT.couleur_principale,
    couleur_accent: couleurValide(t.couleur_accent ?? "") ? t.couleur_accent! : DEFAUT.couleur_accent,
    garde: (["bandeau", "sobre", "colonne"] as const).includes(t.garde as never) ? t.garde! : DEFAUT.garde,
  };
}
