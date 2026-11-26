import { useState } from "react";
import type { Theme } from "./supabase";
import { ANGLES, DETAILS, ENCADRES, ENTETES, EXEMPLES, GARDES, INTERLIGNES, MARGES, NUMEROTATIONS, PAGINATIONS, PALETTES, POLICES, PRESETS,
  TABLEAUX, TAILLES, TITRES, TONS, couleurValide, type ThemeComplet } from "./theme";
import ApercuGarde from "./ApercuGarde";

type Props = { theme: ThemeComplet; onChange: (t: ThemeComplet) => void; nom: string; annee: string };

export default function Style({ theme, onChange, nom, annee }: Props) {
  const [page, setPage] = useState<"garde" | "sommaire" | "corps">("garde");
  const poser = (champs: Partial<ThemeComplet>, voir?: typeof page) => { onChange({ ...theme, ...champs }); if (voir) setPage(voir); };

  return (
    <div className="theme">
      <div className="reglages">
        <Groupe titre="Préréglages" aide="Un point de départ. Tout reste modifiable ensuite.">
          <div className="presets">
            {PRESETS.map((p) => (
              <button type="button" key={p.nom} className="preset" onClick={() => poser({ ...theme, ...p.theme, redaction: theme.redaction }, "garde")}>
                <b>{p.nom}</b><span>{p.aide}</span>
              </button>
            ))}
          </div>
        </Groupe>

        <Groupe titre="Page de garde">
          <Choix options={GARDES} valeur={theme.garde} onChange={(v) => poser({ garde: v }, "garde")} cartes />
        </Groupe>

        <Groupe titre="Couleurs">
          <div className="nuancier">
            {PALETTES.map((p) => (
              <button type="button" key={p.nom} className="nuance"
                aria-pressed={p.principale === theme.couleur_principale && p.accent === theme.couleur_accent}
                onClick={() => poser({ couleur_principale: p.principale, couleur_accent: p.accent })}>
                <span className="bandes"><span style={{ background: `#${p.principale}` }} /><span style={{ background: `#${p.accent}` }} /></span>
                {p.nom}
              </button>
            ))}
          </div>
          <div className="couleurs">
            <Couleur label="Principale" valeur={theme.couleur_principale} onChange={(v) => poser({ couleur_principale: v })} />
            <Couleur label="Accent" valeur={theme.couleur_accent} onChange={(v) => poser({ couleur_accent: v })} />
          </div>
        </Groupe>

        <Groupe titre="Typographie">
          <div className="couleurs">
            <label>Police du texte
              <select value={theme.police} onChange={(e) => poser({ police: e.target.value }, "corps")}>{POLICES.map((p) => <option key={p}>{p}</option>)}</select>
            </label>
            <label>Police des titres
              <select value={theme.police_titres} onChange={(e) => poser({ police_titres: e.target.value })}>{POLICES.map((p) => <option key={p}>{p}</option>)}</select>
            </label>
          </div>
          <Ligne label="Taille du texte"><Choix options={TAILLES.map((x) => ({ id: x, nom: `${String(x).replace(".", ",")} pt` }))} valeur={theme.taille} onChange={(v) => poser({ taille: v }, "corps")} /></Ligne>
          <Ligne label="Interligne"><Choix options={INTERLIGNES.map((x) => ({ id: x, nom: String(x).replace(".", ",") }))} valeur={theme.interligne} onChange={(v) => poser({ interligne: v }, "corps")} /></Ligne>
        </Groupe>

        <Groupe titre="Corps du document">
          <Ligne label="Titres"><Choix options={TITRES} valeur={theme.titres} onChange={(v) => poser({ titres: v }, "corps")} /></Ligne>
          <Ligne label="Numérotation"><Choix options={NUMEROTATIONS} valeur={theme.numerotation} onChange={(v) => poser({ numerotation: v }, "corps")} /></Ligne>
          <Ligne label="Tableaux"><Choix options={TABLEAUX} valeur={theme.tableaux} onChange={(v) => poser({ tableaux: v }, "corps")} /></Ligne>
          <Ligne label="Encadrés"><Choix options={ENCADRES} valeur={theme.encadres} onChange={(v) => poser({ encadres: v }, "corps")} /></Ligne>
        </Groupe>

        <Groupe titre="Ta rédaction" aide="Le fond (problématique, pistes, verdicts, sources) reste celui du groupe. Ton CER est écrit avec ton propre angle et tes propres exemples, donc il ne ressemble pas à celui d'un camarade.">
          <Ligne label="Ton"><Choix options={TONS} valeur={theme.redaction.ton} onChange={(v) => poser({ redaction: { ...theme.redaction, ton: v } })} /></Ligne>
          <Ligne label="Longueur"><Choix options={DETAILS} valeur={theme.redaction.detail} onChange={(v) => poser({ redaction: { ...theme.redaction, detail: v } })} /></Ligne>
          <Ligne label="Angle"><Choix options={ANGLES} valeur={theme.redaction.angle} onChange={(v) => poser({ redaction: { ...theme.redaction, angle: v } })} /></Ligne>
          <Ligne label="Exemples"><Choix options={EXEMPLES} valeur={theme.redaction.exemples} onChange={(v) => poser({ redaction: { ...theme.redaction, exemples: v } })} /></Ligne>
          <p className="small" style={{ marginTop: ".6rem" }}>Sans réglage, CERtain choisit pour toi une combinaison différente de celle de tes camarades.</p>
        </Groupe>

        <Groupe titre="Navigation et mise en page">
          <label className="interrupteur" style={{ marginBottom: "1.1rem" }}>
            <input type="checkbox" checked={theme.sommaire} onChange={(e) => poser({ sommaire: e.target.checked }, "sommaire")} />
            Ajouter un sommaire après la page de garde
          </label>
          <Ligne label="Numéros de page"><Choix options={PAGINATIONS} valeur={theme.pagination} onChange={(v) => poser({ pagination: v }, "corps")} /></Ligne>
          <Ligne label="En-tête"><Choix options={ENTETES} valeur={theme.entete} onChange={(v) => poser({ entete: v }, "corps")} /></Ligne>
          <Ligne label="Marges"><Choix options={MARGES} valeur={theme.marges} onChange={(v) => poser({ marges: v }, "corps")} /></Ligne>
        </Groupe>
      </div>

      <div className="apercu-col">
        <div className="choix petit" role="tablist" aria-label="Page affichée">
          {(["garde", "sommaire", "corps"] as const).map((p) => (
            <button type="button" key={p} aria-pressed={page === p} onClick={() => setPage(p)}>{{ garde: "Garde", sommaire: "Sommaire", corps: "Corps" }[p]}</button>
          ))}
        </div>
        <ApercuGarde theme={theme} nom={nom} annee={annee} page={page} />
        <p className="mono" style={{ marginTop: ".8rem" }}>L'ordre des parties ne change pas : seule la forme est à toi.</p>
      </div>
    </div>
  );
}

function Groupe({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return <fieldset className="groupe"><legend className="meta">{titre}</legend>{aide && <p className="doux" style={{ fontSize: ".85rem", margin: "-.2rem 0 .8rem" }}>{aide}</p>}{children}</fieldset>;
}
function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="ligne-reglage"><span>{label}</span>{children}</div>;
}
function Choix<T extends string | number>({ options, valeur, onChange, cartes }: {
  options: readonly { id: T; nom: string; aide?: string }[]; valeur: T; onChange: (v: T) => void; cartes?: boolean;
}) {
  return (
    <div className={cartes ? "cartes" : "choix"}>
      {options.map((o) => (
        <button type="button" key={String(o.id)} aria-pressed={valeur === o.id} onClick={() => onChange(o.id)} title={o.aide}>
          {cartes ? <><b>{o.nom}</b><span>{o.aide}</span></> : o.nom}
        </button>
      ))}
    </div>
  );
}
function Couleur({ label, valeur, onChange }: { label: string; valeur: string; onChange: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur);
  const ok = couleurValide(texte);
  const poser = (v: string) => { setTexte(v); if (couleurValide(v)) onChange(v); };
  return (
    <label>{label}
      <span className="couleur">
        <input type="color" value={`#${valeur}`} onChange={(e) => poser(e.target.value.slice(1).toUpperCase())} aria-label={`${label}, sélecteur`} />
        <input type="text" value={texte} maxLength={6} onChange={(e) => poser(e.target.value.replace("#", "").toUpperCase())} aria-invalid={!ok} />
      </span>
      {!ok && <small className="erreur">Trop clair pour être lu sur une page blanche.</small>}
    </label>
  );
}
export type { Theme };
