import { createClient } from "@supabase/supabase-js";

// Clés publiques (publishable) : sans danger dans le navigateur, la sécurité repose sur les règles RLS.
export const SUPABASE_URL = "https://wrzeqqlyeqmvmwxddkew.supabase.co";
export const supabase = createClient(SUPABASE_URL, "sb_publishable_0CJOjiWKHAOXvSpuJIclrA_uH2BdbY8");

export type Theme = {
  police?: string;
  couleur_principale?: string;
  couleur_accent?: string;
  garde?: "bandeau" | "sobre" | "colonne";
};
export type Etudiant = {
  id: string; email: string; nom: string; prenoms: string; groupe: string;
  theme: Theme; moodle_relie: boolean;
};
export type Prosit = {
  id: string; createur_id: string; numero: number; notion: string; cours: string;
  cmid: number | null; groupe: string; annee: string; echeance: string | null;
  statut: string; a_relire: string[];
};
export type Membre = {
  prosit_id: string; etudiant_id: string; invitation: "invite" | "accepte" | "refuse";
  annule: boolean; fichier: string | null; depot_statut: string | null; depose_le: string | null;
};

export const STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "Prêt à rédiger",
  en_redaction: "Rédaction en cours",
  pret: "CER prêt, dépôt programmé",
  depose: "Déposé sur Moodle",
  a_relire: "À relire",
  erreur: "Erreur",
};

export function anneeCourante() {
  const d = new Date();
  const debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${debut}/${debut + 1}`;
}
