"""Outil de la session de rédaction CERtain : lit les prosits à rédiger, renvoie les CER.

    python certain/pipeline.py a-rediger            # prépare travail/<prosit_id>/ pour chaque prosit lancé
    python certain/pipeline.py livrer travail/<id>   # envoie les .docx + livraison.json, statut « pret » ou « a_relire »
    python certain/pipeline.py erreur <id> "raison"  # marque en erreur les prosits du dossier
    python certain/pipeline.py mesure travail/<id>   # enregistre le coût de la session (jetons, dollars estimés)

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
    """Un dossier par (devoir Moodle, promotion). Les prosits individuels du même devoir sont rédigés ensemble :
    fond commun (mêmes faits), une version par étudiant. Chaque étudiant garde son prosit et ne voit pas les autres."""
    prosits = rest("GET", "prosits", "?statut=eq.en_attente&select=*&order=cree_le.asc")
    if not prosits:
        print("Rien à rédiger.")
        return
    groupes = {}
    for p in prosits:
        groupes.setdefault((p["cmid"], p.get("promotion")), []).append(p)

    def lister(prefixe):
        return appel("POST", "/storage/v1/object/list/prosits", {"prefix": prefixe, "limit": 100}) or []

    def telecharger(chemin, cible):
        contenu = appel("GET", f"/storage/v1/object/prosits/{urllib.parse.quote(chemin)}", brut=True)
        cible.parent.mkdir(parents=True, exist_ok=True)
        cible.write_bytes(contenu)

    for (_cmid, _promo), liste in groupes.items():
        retenus, membres = [], []
        for p in liste:
            pid = p["id"]
            # Verrou : on ne prend le prosit que s'il est toujours en attente
            if not rest("PATCH", "prosits", f"?id=eq.{pid}&statut=eq.en_attente", {"statut": "en_redaction"}):
                continue
            ms = rest("GET", "prosit_membres",
                      f"?prosit_id=eq.{pid}&invitation=eq.accepte&annule=eq.false"
                      "&select=etudiant_id,fichier,refaire,etudiants(nom,prenoms,theme,credits)")
            # Crédits indépendants : on rédige pour qui n'a pas encore son CER et a un crédit, ou demande une refonte
            ms = [m for m in ms if m.get("refaire") or (not m.get("fichier") and m["etudiants"]["credits"] > 0)]
            if not ms:   # plus personne à rédiger : on remet le prosit où il était
                deja = rest("GET", "prosit_membres", f"?prosit_id=eq.{pid}&fichier=not.is.null&select=etudiant_id")
                rest("PATCH", "prosits", f"?id=eq.{pid}", {"statut": "pret" if deja else "brouillon"})
                continue
            retenus.append(p)
            membres += [{**m, "prosit_id": pid} for m in ms]
        if not retenus:
            continue
        base = retenus[0]
        dossier = Path("travail") / base["id"]
        dossier.mkdir(parents=True, exist_ok=True)
        # Documents du fond commun : énoncé, ressources du cours (et aller/retour de groupe hérités, s'il y en a)
        vus = set()
        for p in retenus:
            for o in lister(p["id"]):
                nom = o["name"]
                if nom in vus:
                    continue
                if nom.split(".")[0] in ("enonce", "aller", "retour") or nom.startswith("ressource_"):
                    telecharger(f"{p['id']}/{nom}", dossier / nom)
                    vus.add(nom)
        # Documents personnels : perso/<id_etudiant>/aller.* et retour.* (ils servent au seul CER de cet étudiant)
        perso = {}
        for p in retenus:
            for d in lister(f"{p['id']}/perso"):
                for o in lister(f"{p['id']}/perso/{d['name']}"):
                    if o["name"].split(".")[0] in ("aller", "retour"):
                        telecharger(f"{p['id']}/perso/{d['name']}/{o['name']}", dossier / "perso" / d["name"] / o["name"])
                        perso.setdefault(d["name"], {})[o["name"].split(".")[0]] = f"perso/{d['name']}/{o['name']}"
        fiche = {
            "id": base["id"], "prosits": [p["id"] for p in retenus],
            "numero": base["numero"], "notion": base["notion"], "cours": base["cours"], "cmid": base["cmid"],
            "groupe": base.get("groupe") or "", "annee": base["annee"], "echeance": base["echeance"],
            "membres": [{"nom": m["etudiants"]["nom"], "prenoms": m["etudiants"]["prenoms"],
                         "id_etudiant": m["etudiant_id"], "prosit_id": m["prosit_id"], "theme": m["etudiants"]["theme"],
                         "documents_perso": perso.get(m["etudiant_id"], {})} for m in membres],
        }
        (dossier / "prosit.json").write_text(json.dumps(fiche, ensure_ascii=False, indent=2))
        print(f"{dossier}\tProsit {base['numero']} — {base['notion']}\t{len(membres)} membre(s)\tdocs: "
              f"{', '.join(sorted(x.name for x in dossier.iterdir() if x.is_file() and x.name != 'prosit.json')) or 'aucun'}"
              f"\tdocuments perso : {sum(len(v) for v in perso.values())}")


def livrer(dossier):
    dossier = Path(dossier)
    fiche = json.loads((dossier / "prosit.json").read_text())
    liv = json.loads((dossier / "livraison.json").read_text())
    prosit_de = {m["id_etudiant"]: m.get("prosit_id", fiche["id"]) for m in fiche["membres"]}
    for etudiant, nom_fichier in liv.get("fichiers", {}).items():
        pid = prosit_de.get(etudiant, fiche["id"])
        chemin = f"{pid}/{nom_fichier}"
        appel("POST", f"/storage/v1/object/prosits/{urllib.parse.quote(chemin)}", (dossier / nom_fichier).read_bytes(),
              {"Content-Type": DOCX, "x-upsert": "true"})
        rest("PATCH", "prosit_membres", f"?prosit_id=eq.{pid}&etudiant_id=eq.{etudiant}",
             {"fichier": chemin, "depot_statut": "CER prêt", "refaire": False,
              "fichier_maj_le": datetime.now(timezone.utc).isoformat()})
    # Dépôt d'abord, relecture ensuite : « a_relire » part aussi sur Moodle tout de suite
    statut = "pret" if liv.get("statut") == "pret" else "a_relire"
    for pid in fiche.get("prosits", [fiche["id"]]):
        rest("PATCH", "prosits", f"?id=eq.{pid}", {"statut": statut, "a_relire": liv.get("a_relire", [])})
    print(f"Prosit {fiche['numero']} : {len(liv.get('fichiers', {}))} CER envoyés, statut « {statut} ».")


def erreur(pid, raison):
    fiche = Path("travail") / pid / "prosit.json"
    ids = json.loads(fiche.read_text()).get("prosits", [pid]) if fiche.exists() else [pid]
    for i in ids:
        rest("PATCH", "prosits", f"?id=eq.{i}", {"statut": "erreur", "a_relire": [raison]})
    print(f"{len(ids)} prosit(s) marqué(s) en erreur.")


# Tarifs Sonnet 5.5 par million de jetons : entrée 2 $, sortie 10 $, cache lu 0,10 $, cache écrit 2,50 $ (5 min) ou 4 $ (1 h)
def mesure(dossier):
    """Additionne les jetons de la session en cours (journal de Claude Code) et enregistre le coût estimé."""
    fiche = json.loads((Path(dossier) / "prosit.json").read_text())
    journaux = sorted(Path.home().glob(".claude/projects/*/*.jsonl"), key=lambda f: f.stat().st_mtime)
    if not journaux:
        sys.exit("Journal de session introuvable.")
    par_message, recherches = {}, 0
    for ligne in journaux[-1].read_text().splitlines():
        try:
            d = json.loads(ligne)
        except ValueError:
            continue
        m = d.get("message") if isinstance(d.get("message"), dict) else None
        if m and m.get("usage"):
            par_message[m.get("id") or ligne[:40]] = m["usage"]   # un message peut apparaître plusieurs fois : on garde le dernier
    t = dict(entree=0, ecrit5=0, ecrit1h=0, lu=0, sortie=0)
    for u in par_message.values():
        c = u.get("cache_creation") or {}
        t["entree"] += u.get("input_tokens", 0); t["sortie"] += u.get("output_tokens", 0); t["lu"] += u.get("cache_read_input_tokens", 0)
        t["ecrit5"] += c.get("ephemeral_5m_input_tokens", 0); t["ecrit1h"] += c.get("ephemeral_1h_input_tokens", 0)
        if not c: t["ecrit5"] += u.get("cache_creation_input_tokens", 0)
        recherches += (u.get("server_tool_use") or {}).get("web_search_requests", 0)
    usd = (t["entree"] * 2 + t["sortie"] * 10 + t["lu"] * 0.10 + t["ecrit5"] * 2.5 + t["ecrit1h"] * 4) / 1e6
    rest("POST", "couts_redaction", "", {
        "prosit_id": fiche["id"], "membres": len(fiche["membres"]), "jetons_entree": t["entree"],
        "jetons_cache_ecrit": t["ecrit5"] + t["ecrit1h"], "jetons_cache_lu": t["lu"], "jetons_sortie": t["sortie"],
        "recherches_web": recherches, "cout_usd_sonnet": round(usd, 3)})
    print(f"Coût estimé aux tarifs Sonnet 5.5 : {usd:.2f} $ pour {len(fiche['membres'])} membre(s) ({recherches} recherches web, non comptées).")


if __name__ == "__main__":
    cmd = sys.argv[1:] or ["aide"]
    if cmd[0] == "a-rediger":
        a_rediger()
    elif cmd[0] == "livrer" and len(cmd) == 2:
        livrer(cmd[1])
    elif cmd[0] == "erreur" and len(cmd) == 3:
        erreur(cmd[1], cmd[2])
    elif cmd[0] == "mesure" and len(cmd) == 2:
        mesure(cmd[1])
    else:
        print(__doc__)
