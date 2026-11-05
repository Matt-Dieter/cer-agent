"""Dépose un fichier dans un devoir Moodle (mod_assign) avec un navigateur automatisé.

Usage :
    python moodle_depot.py --devoir-id 1234 --fichier "CER Prosit 3.docx" [--brouillon]

Variables d'environnement (à définir dans les réglages de l'environnement, jamais dans le chat) :
    MOODLE_URL       ex. https://moodle.exemple.com (sans / final)
    MOODLE_USER      identifiant Moodle
    MOODLE_PASSWORD  mot de passe Moodle

Sans --brouillon, le devoir est envoyé pour évaluation (dépôt définitif).
Une capture d'écran de chaque étape est enregistrée dans ./captures pour contrôle.
"""
import argparse
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout


def capture(page, nom):
    Path("captures").mkdir(exist_ok=True)
    page.screenshot(path=f"captures/{nom}.png", full_page=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--devoir-id", required=True, help="id du devoir (le ?id= de mod/assign/view.php)")
    ap.add_argument("--fichier", required=True)
    ap.add_argument("--brouillon", action="store_true", help="enregistrer sans envoyer pour évaluation")
    args = ap.parse_args()

    base = os.environ["MOODLE_URL"].rstrip("/")
    fichier = Path(args.fichier).resolve()
    if not fichier.is_file():
        sys.exit(f"Fichier introuvable : {fichier}")

    with sync_playwright() as p:
        nav = p.chromium.launch()
        page = nav.new_page(locale="fr-FR")

        # 1. Connexion (formulaire Moodle standard)
        page.goto(f"{base}/login/index.php")
        page.fill("#username", os.environ["MOODLE_USER"])
        page.fill("#password", os.environ["MOODLE_PASSWORD"])
        page.click("#loginbtn")
        page.wait_for_load_state("networkidle")
        if "login/index.php" in page.url:
            capture(page, "01-echec-connexion")
            sys.exit("Échec de connexion : identifiants refusés ou connexion par SSO (voir captures/).")

        # 2. Page d'édition de la remise
        page.goto(f"{base}/mod/assign/view.php?id={args.devoir_id}&action=editsubmission")
        page.wait_for_load_state("networkidle")
        capture(page, "02-edition")

        # 3. Retirer un ancien fichier éventuel, puis ajouter le nouveau via le sélecteur de fichiers
        for ancien in page.locator(".filemanager .fp-file").all():
            ancien.click()
            page.click(".fp-file-delete:visible")
            page.click(".fp-dlg-butconfirm:visible")
        page.click(".filemanager .fp-btn-add a, .filemanager .fp-btn-add")
        page.click(".fp-repo-area a:has-text('Déposer un fichier'), .fp-repo-area a:has-text('Upload a file')")
        page.set_input_files("input[type=file][name=repo_upload_file]", str(fichier))
        page.click(".fp-upload-btn:visible")
        page.wait_for_selector(f".filemanager .fp-filename:has-text('{fichier.name[:20]}')", timeout=60000)
        capture(page, "03-fichier-ajoute")

        # 4. Enregistrer
        page.click("#id_submitbutton")
        page.wait_for_load_state("networkidle")
        capture(page, "04-enregistre")

        # 5. Envoi pour évaluation (si le devoir l'exige et que ce n'est pas un brouillon)
        if not args.brouillon:
            try:
                page.click("button:has-text('Envoyer le devoir'), input[value='Envoyer le devoir'], "
                           "button:has-text('Submit assignment'), input[value='Submit assignment']", timeout=5000)
                page.wait_for_load_state("networkidle")
                decl = page.locator("#id_submissionstatement")
                if decl.count():
                    decl.check()
                page.click("#id_submitbutton")
                page.wait_for_load_state("networkidle")
            except PWTimeout:
                print("Pas de bouton « Envoyer le devoir » : le dépôt enregistré vaut remise sur ce devoir.")

        capture(page, "05-statut")
        statut = page.locator(".submissionstatustable").inner_text() if page.locator(".submissionstatustable").count() else ""
        print(statut or "Statut introuvable, voir captures/05-statut.png")
        nav.close()


if __name__ == "__main__":
    main()
