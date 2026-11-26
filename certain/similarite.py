"""Compare les versions .docx d'un même prosit deux à deux et mesure leur ressemblance.

    python certain/similarite.py travail/<prosit_id>

Pour chaque paire : part des paragraphes de la partie II à la conclusion qui ressemblent à plus de 0,8 à un paragraphe de
l'autre version, et ressemblance globale du texte. Seuil du skill : moins de 30 % de paragraphes semblables.
Ne juge pas les faits : à relire à part (verdicts, chiffres, sources identiques).
"""
import difflib, itertools, re, sys
from pathlib import Path
import docx

SEUIL_PARAGRAPHE, SEUIL_PART = 0.8, 0.30


def paragraphes(chemin):
    d = docx.Document(chemin)
    corps, dedans = [], False
    for p in d.paragraphs:
        t = re.sub(r"\s+", " ", p.text).strip()
        if re.match(r"^(II|2)\.?\s", t) and "RÉALISATION" in t.upper():
            dedans = True
        if dedans and len(t) > 60:           # on ignore titres et lignes courtes
            corps.append(t)
    return corps


def main(dossier):
    fichiers = sorted(Path(dossier).glob("CER_*.docx"))
    if len(fichiers) < 2:
        print("Moins de deux versions : rien à comparer.")
        return 0
    textes = {f.name: paragraphes(f) for f in fichiers}
    pire, ok = 0.0, True
    for a, b in itertools.combinations(textes, 2):
        pa, pb = textes[a], textes[b]
        if not pa or not pb:
            print(f"{a} / {b} : partie II introuvable, contrôle impossible")
            ok = False
            continue
        proches = sum(1 for x in pa if max(difflib.SequenceMatcher(None, x, y).ratio() for y in pb) > SEUIL_PARAGRAPHE)
        part = proches / len(pa)
        globale = difflib.SequenceMatcher(None, " ".join(pa), " ".join(pb), autojunk=False).ratio()
        pire = max(pire, part)
        verdict = "OK" if part < SEUIL_PART else "TROP PROCHES : réécrire la version la plus proche"
        ok = ok and part < SEUIL_PART
        print(f"{a}  ↔  {b}\n   paragraphes semblables : {proches}/{len(pa)} ({part:.0%}) | ressemblance globale : {globale:.2f} | {verdict}")
    print(f"similarite_max : {pire:.2f}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]) if len(sys.argv) == 2 else print(__doc__) or 2)
