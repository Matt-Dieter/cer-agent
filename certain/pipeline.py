"""Outil de la session de rédaction CERtain : lit les prosits à rédiger, renvoie les CER.

    python certain/pipeline.py a-rediger            # prépare travail/<prosit_id>/ pour chaque prosit lancé
    python certain/pipeline.py livrer travail/<id>   # envoie les .docx + livraison.json, statut « pret » ou « a_relire »
    python certain/pipeline.py erreur <id> "raison"  # marque le prosit en erreur

Accès : la clé secrète Supabase est injectée par le proxy de l'environnement (en-tête apikey).
Ce script n'a jamais la clé : il envoie une valeur factice que le proxy remplace.
Aucun jeton Moodle n'est lu ici : le dépôt est fait par la fonction serveur « deposer ».
"""
import json
from datetime import datetime, timezone
import sys
import urllib.parse
import urllib.request
from pathlib import Path

URL = "https://wrzeqqlyeqmvmwxddkew.supabase.co"
ENTETES = {"apikey": "proxy-injected"}
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def appel(methode, chemin, corps=None, entetes=None, brut=False):
    donnees = corps if isinstance(corps, (bytes, type(None))) else json.dumps(corps).encode()
    h = {**ENTETES, **({"Content-Type": "application/json"} if donnees and not isinstance(corps, bytes) else {}), **(entetes or {})}
    req = urllib.request.Request(URL + chemin, data=donnees, headers=h, method=methode)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            contenu = r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase {e.code} sur {methode} {chemin} : {e.read()[:300].decode(errors='replace')}")
    if brut:
        return contenu
    return json.loads(contenu) if contenu else None


def rest(methode, table, requete="", corps=None):
    return appel(methode, f"/rest/v1/{table}{requete}", corps, {"Prefer": "return=representation"})


def a_rediger():
    prosits = rest("GET", "prosits", "?statut=eq.en_attente&select=*")
    if not prosits:
        print("Rien à rédiger.")
        return
    for p in prosits:
        pid = p["id"]
        # Verrou : on ne prend le prosit que s'il est toujours en attente
        pris = rest("PATCH", "prosits", f"?id=eq.{pid}&statut=eq.en_attente", {"statut": "en_redaction"})
        if not pris:
            continue
        membres = rest("GET", "prosit_membres",
                       f"?prosit_id=eq.{pid}&invitation=eq.accepte&annule=eq.false"
                       "&select=etudiant_id,etudiants(nom,prenoms,theme)")
        dossier = Path("travail") / pid
        dossier.mkdir(parents=True, exist_ok=True)
        def lister(prefixe):
            return appel("POST", "/storage/v1/object/list/prosits", {"prefix": prefixe, "limit": 100}) or []

        def telecharger(chemin, cible):
            contenu = appel("GET", f"/storage/v1/object/prosits/{urllib.parse.quote(chemin)}", brut=True)
            cible.parent.mkdir(parents=True, exist_ok=True)
            cible.write_bytes(contenu)

        # Documents du groupe : énoncé, aller, retour, ressources du cours
        for o in lister(pid):
            if o["name"].split(".")[0] in ("enonce", "aller", "retour") or o["name"].startswith("ressource_"):
                telecharger(f"{pid}/{o['name']}", dossier / o["name"])
        # Documents personnels : perso/<id_etudiant>/aller.* et retour.* (ils servent au seul CER de cet étudiant)
        perso = {}
        for d in lister(f"{pid}/perso"):
            for o in lister(f"{pid}/perso/{d['name']}"):
                if o["name"].split(".")[0] in ("aller", "retour"):
                    telecharger(f"{pid}/perso/{d['name']}/{o['name']}", dossier / "perso" / d["name"] / o["name"])
                    perso.setdefault(d["name"], {})[o["name"].split(".")[0]] = f"perso/{d['name']}/{o['name']}"
        fiche = {
            "id": pid, "numero": p["numero"], "notion": p["notion"], "cours": p["cours"], "cmid": p["cmid"],
            "groupe": p["groupe"], "annee": p["annee"], "echeance": p["echeance"],
            "membres": [{"nom": m["etudiants"]["nom"], "prenoms": m["etudiants"]["prenoms"],
                         "id_etudiant": m["etudiant_id"], "theme": m["etudiants"]["theme"],
                         "documents_perso": perso.get(m["etudiant_id"], {})} for m in membres],
        }
        (dossier / "prosit.json").write_text(json.dumps(fiche, ensure_ascii=False, indent=2))
        print(f"{dossier}\tProsit {p['numero']} — {p['notion']}\t{len(membres)} membre(s)\tdocs: "
              f"{', '.join(sorted(x.name for x in dossier.iterdir() if x.is_file() and x.name != 'prosit.json')) or 'aucun'}"
              f"\tdocuments perso : {sum(len(v) for v in perso.values())}")


def livrer(dossier):
    dossier = Path(dossier)
    fiche = json.loads((dossier / "prosit.json").read_text())
    liv = json.loads((dossier / "livraison.json").read_text())
    pid = fiche["id"]
    for etudiant, nom_fichier in liv.get("fichiers", {}).items():
        chemin = f"{pid}/{nom_fichier}"
        appel("POST", f"/storage/v1/object/prosits/{urllib.parse.quote(chemin)}", (dossier / nom_fichier).read_bytes(),
              {"Content-Type": DOCX, "x-upsert": "true"})
        rest("PATCH", "prosit_membres", f"?prosit_id=eq.{pid}&etudiant_id=eq.{etudiant}",
             {"fichier": chemin, "depot_statut": "CER prêt",
              "fichier_maj_le": datetime.now(timezone.utc).isoformat()})
    # Dépôt d'abord, relecture ensuite : « a_relire » part aussi sur Moodle tout de suite
    statut = "pret" if liv.get("statut") == "pret" else "a_relire"
    rest("PATCH", "prosits", f"?id=eq.{pid}", {"statut": statut, "a_relire": liv.get("a_relire", [])})
    print(f"Prosit {fiche['numero']} : {len(liv.get('fichiers', {}))} CER envoyés, statut « {statut} ».")


def erreur(pid, raison):
    rest("PATCH", "prosits", f"?id=eq.{pid}", {"statut": "erreur", "a_relire": [raison]})
    print(f"Prosit {pid} marqué en erreur.")


if __name__ == "__main__":
    cmd = sys.argv[1:] or ["aide"]
    if cmd[0] == "a-rediger":
        a_rediger()
    elif cmd[0] == "livrer" and len(cmd) == 2:
        livrer(cmd[1])
    elif cmd[0] == "erreur" and len(cmd) == 3:
        erreur(cmd[1], cmd[2])
    else:
        print(__doc__)
