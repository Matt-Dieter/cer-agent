import { createClient } from "@supabase/supabase-js";

// Clés publiques (publishable) : sans danger dans le navigateur, la sécurité repose sur les règles RLS.
export const SUPABASE_URL = "https://wrzeqqlyeqmvmwxddkew.supabase.co";
export const supabase = createClient(SUPABASE_URL, "sb_publishable_0CJOjiWKHAOXvSpuJIclrA_uH2BdbY8");

// Personnalisation du CER (voir theme.ts et le skill cer-prosit-groupe)
export type Theme = {
  police?: string; police_titres?: string; taille?: number; interligne?: number;
  couleur_principale?: string; couleur_accent?: string;
  garde?: "bandeau" | "sobre" | "colonne" | "centree" | "cadre" | "moderne";
  titres?: "filet" | "numero" | "bande" | "capitales" | "simple";
  numerotation?: "romain" | "decimal" | "aucune";
  tableaux?: "raye" | "grille" | "lignes" | "minimal";
  encadres?: "barre" | "fond" | "cadre";
  sommaire?: boolean;
  pagination?: "page_sur" | "numero" | "tiret" | "aucune";
  entete?: "complet" | "titre" | "aucun";
  marges?: "etroites" | "normales" | "larges";
  // Contenu : voir le skill cer-prosit-groupe, section « Contenu propre à chaque membre »
  redaction?: Redaction;
};
export type Redaction = {
  ton?: "formel" | "pedagogique" | "direct";
  detail?: "concis" | "standard" | "approfondi";
  angle?: "technique" | "metier" | "mixte";
  exemples?: "cas_enonce" | "autres_domaines";
};
export type Etudiant = {
  id: string; email: string; nom: string; prenoms: string; groupe: string;
  theme: Theme; moodle_relie: boolean; auto: boolean; role: "etudiant" | "admin"; actif: boolean;
};
export type Prosit = {
  id: string; createur_id: string; numero: number; notion: string; cours: string;
  cmid: number | null; groupe: string; annee: string; echeance: string | null;
  statut: string; a_relire: string[]; source: "manuel" | "moodle";
};
export type Membre = {
  prosit_id: string; etudiant_id: string; invitation: "invite" | "accepte" | "refuse";
  annule: boolean; fichier: string | null; depot_statut: string | null; depose_le: string | null; fichier_maj_le: string | null;
};

export const STATUTS: Record<string, string> = {
  brouillon: "En attente des documents",
  en_attente: "Rédaction programmée",
  en_redaction: "Rédaction en cours",
  pret: "Prêt · dépôt en cours",
  depose: "Déposé sur Moodle",
  a_relire: "Dépôt en cours · à relire",
  erreur: "Erreur",
};
export const TON: Record<string, string> = {
  brouillon: "", en_attente: "vif", en_redaction: "vif", pret: "vif", depose: "ok", a_relire: "attention", erreur: "alerte",
};
export function dateCourte(iso: string | null) {
  if (!iso) return "sans échéance";
  return new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function delai(iso: string | null) {
  if (!iso) return "";
  const h = Math.round((new Date(iso).getTime() - Date.now()) / 3600_000);
  if (h < 0) return "échéance passée";
  if (h < 24) return `dans ${h} h`;
  return `dans ${Math.round(h / 24)} j`;
}

export function anneeCourante() {
  const d = new Date();
  const debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${debut}/${debut + 1}`;
}
