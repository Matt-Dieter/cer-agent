import { useState } from "react";

type Choix = "auto" | "light" | "dark";
const LIBELLES: [Choix, string][] = [["light", "Clair"], ["dark", "Sombre"], ["auto", "Auto"]];

// Préférence propre à cet appareil (pas besoin de la synchroniser entre comptes)
function lire(): Choix {
  try { const t = localStorage.getItem("certain-theme"); return t === "light" || t === "dark" ? t : "auto"; }
  catch { return "auto"; }
}

export default function Themes() {
  const [choix, setChoix] = useState<Choix>(lire);
  const poser = (c: Choix) => {
    setChoix(c);
    if (c === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = c;
    try { c === "auto" ? localStorage.removeItem("certain-theme") : localStorage.setItem("certain-theme", c); } catch { /* navigation privée */ }
  };
  return (
    <div className="themes" role="group" aria-label="Thème d'affichage">
      {LIBELLES.map(([c, l]) => <button key={c} type="button" aria-pressed={choix === c} onClick={() => poser(c)}>{l}</button>)}
    </div>
  );
}
