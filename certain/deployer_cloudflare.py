"""Publie le site (site/dist) sur Cloudflare Pages par l'API, sans wrangler.

    cd site && SITE_BASE=/ npm run build && cd .. && python certain/deployer_cloudflare.py

Le jeton Cloudflare est injecté par le proxy de l'environnement (en-tête Authorization) :
ce script envoie une valeur factice, jamais le vrai jeton. Pourquoi pas wrangler : il envoie les fichiers avec
un jeton temporaire que le proxy écraserait, d'où l'erreur « Authorization failed [8000013] ».
Dépendance : pip install blake3
"""
import base64, json, mimetypes, pathlib, subprocess, sys
from blake3 import blake3

COMPTE = "0c5eb5e3de7c821b10e95f69622bc6cc"
PROJET = "certain"
racine = pathlib.Path("site/dist")
if not racine.is_dir():
    sys.exit("site/dist introuvable : compile d'abord avec SITE_BASE=/ npm run build")

manifeste, champs = {}, []
for f in sorted(racine.rglob("*")):
    if not f.is_file():
        continue
    h = blake3((base64.b64encode(f.read_bytes()).decode() + f.suffix.lstrip(".")).encode()).hexdigest()[:32]
    manifeste["/" + str(f.relative_to(racine))] = h
    champs += ["-F", f"{h}=@{f};type={mimetypes.guess_type(f.name)[0] or 'application/octet-stream'};filename={h}"]

sortie = subprocess.run(
    ["curl", "-sS", "-X", "POST", f"https://api.cloudflare.com/client/v4/accounts/{COMPTE}/pages/projects/{PROJET}/deployments",
     "-H", "Authorization: Bearer proxy-injected", "-F", "branch=main", "-F", f"manifest={json.dumps(manifeste)}", *champs],
    capture_output=True, text=True).stdout
d = json.loads(sortie)
if not d.get("success"):
    sys.exit(f"Échec : {d.get('errors')}")
print("Déployé :", d["result"]["url"], "| adresse principale : https://certain-3l1.pages.dev/")
