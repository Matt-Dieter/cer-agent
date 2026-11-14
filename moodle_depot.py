"""Dépose un CER dans un devoir Moodle par l'API mobile (pas de navigateur).

Usage :
    python moodle_depot.py --cmid 4957 --fichier "CER_Prosit_3.docx"   # dépose (remplace le fichier existant)
    python moodle_depot.py --cmid 4957 --statut                         # affiche l'état, sans rien changer
    python moodle_depot.py --liste                                      # liste les devoirs « CER » à venir

--cmid : le nombre après ?id= dans l'adresse du devoir (mod/assign/view.php?id=...).

Variables d'environnement (réglages de l'environnement, jamais dans le dépôt) :
    MOODLE_URL, MOODLE_USER, MOODLE_PASSWORD
"""
import argparse
import datetime
import json
import mimetypes
import os
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE = os.environ["MOODLE_URL"].rstrip("/")


def _post(path, data=None, body=None, headers=None):
    if body is None:
        body = urllib.parse.urlencode(data or {}, doseq=True).encode()
    req = urllib.request.Request(BASE + path, body, headers or {})
    with urllib.request.urlopen(req, timeout=120) as r:
        rep = json.load(r)
    if isinstance(rep, dict) and rep.get("exception"):
        sys.exit(f"Erreur Moodle : {rep.get('errorcode')} — {rep.get('message')}")
    return rep


def jeton():
    rep = _post("/login/token.php", {
        "username": os.environ["MOODLE_USER"],
        "password": os.environ["MOODLE_PASSWORD"],
        "service": "moodle_mobile_app",
    })
    if "token" not in rep:
        sys.exit(f"Connexion refusée : {rep.get('errorcode')}. Ne pas réessayer en boucle (risque de blocage du compte).")
    return rep["token"]


def ws(tok, fonction, **args):
    return _post("/webservice/rest/server.php",
                 {"wstoken": tok, "wsfunction": fonction, "moodlewsrestformat": "json", **args})


def devoirs(tok):
    for cours in ws(tok, "mod_assign_get_assignments").get("courses", []):
        for d in cours["assignments"]:
            yield cours, d


def devoir_par_cmid(tok, cmid):
    for cours, d in devoirs(tok):
        if d["cmid"] == cmid:
            return cours, d
    sys.exit(f"Aucun devoir avec cmid={cmid} dans tes cours.")


def statut(tok, assignid):
    s = ws(tok, "mod_assign_get_submission_status", assignid=assignid)
    sub = (s.get("lastattempt") or {}).get("submission") or {}
    fichiers = [f["filename"] for p in sub.get("plugins", [])
                for fa in p.get("fileareas", []) for f in fa.get("files", [])]
    return sub.get("status") or "aucune remise", fichiers, (s.get("lastattempt") or {}).get("canedit")


def televerser_brouillon(tok, fichier: Path):
    """Envoie le fichier dans une zone brouillon de l'utilisateur ; renvoie son itemid."""
    limite = "----cer" + uuid.uuid4().hex
    type_mime = mimetypes.guess_type(fichier.name)[0] or "application/octet-stream"
    parties = []
    for nom, val in {"token": tok, "filearea": "draft", "itemid": "0"}.items():
        parties.append(f'--{limite}\r\nContent-Disposition: form-data; name="{nom}"\r\n\r\n{val}\r\n'.encode())
    parties.append(f'--{limite}\r\nContent-Disposition: form-data; name="file_1"; filename="{fichier.name}"\r\n'
                   f"Content-Type: {type_mime}\r\n\r\n".encode() + fichier.read_bytes() + b"\r\n")
    parties.append(f"--{limite}--\r\n".encode())
    rep = _post("/webservice/upload.php", body=b"".join(parties),
                headers={"Content-Type": f"multipart/form-data; boundary={limite}"})
    if not isinstance(rep, list) or not rep or "itemid" not in rep[0]:
        sys.exit(f"Téléversement échoué : {rep}")
    return rep[0]["itemid"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cmid", type=int)
    ap.add_argument("--fichier")
    ap.add_argument("--statut", action="store_true")
    ap.add_argument("--liste", action="store_true")
    a = ap.parse_args()
    tok = jeton()

    if a.liste:
        maintenant = time.time()
        for cours, d in devoirs(tok):
            if "cer" in d["name"].lower() and d["duedate"] > maintenant:
                ech = datetime.datetime.fromtimestamp(d["duedate"]).strftime("%d/%m/%Y %H:%M")
                print(f'cmid={d["cmid"]}\t{ech}\t[{cours["shortname"]}] {d["name"]}')
        return

    if not a.cmid:
        sys.exit("--cmid requis")
    cours, d = devoir_par_cmid(tok, a.cmid)
    print(f'Devoir : [{cours["shortname"]}] {d["name"]}')

    if a.statut or not a.fichier:
        st, fichiers, modif = statut(tok, d["id"])
        print(f"Statut : {st} | fichiers : {fichiers} | modifiable : {modif}")
        return

    fichier = Path(a.fichier).resolve()
    if not fichier.is_file():
        sys.exit(f"Fichier introuvable : {fichier}")
    itemid = televerser_brouillon(tok, fichier)
    ws(tok, "mod_assign_save_submission", assignmentid=d["id"],
       **{"plugindata[files_filemanager]": itemid})
    if d.get("submissiondrafts"):
        decl = {"acceptsubmissionstatement": 1} if d.get("requiresubmissionstatement") else {}
        ws(tok, "mod_assign_submit_for_grading", assignmentid=d["id"], **decl)
    st, fichiers, _ = statut(tok, d["id"])
    print(f"Déposé. Statut : {st} | fichiers : {fichiers}")
    if fichier.name not in fichiers:
        sys.exit("Attention : le fichier n'apparaît pas dans la remise, vérifier sur Moodle.")


if __name__ == "__main__":
    main()
