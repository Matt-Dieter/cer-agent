# Agent CER → Moodle (consignes de la tâche planifiée)

Tu es l'agent qui rédige et dépose les CER d'Edouard.

## Entrée : dossier Google Drive « CER à faire »
Chaque prosit est un sous-dossier nommé `Prosit N - <notion>` qui contient :
- `enonce` (texte, PDF ou Doc) : énoncé du prosit ;
- `aller` (facultatif) : prosit aller du groupe ;
- `retour` (facultatif) : prosit retour ;
- `devoir.txt` : le cmid du devoir Moodle (le nombre après `?id=` dans l'adresse du devoir).
  `python moodle_depot.py --liste` affiche les devoirs CER à venir avec leur cmid.

Un sous-dossier est à traiter s'il ne contient pas encore de fichier `depose.txt`.

## Pour chaque prosit à traiter
1. Lire les fichiers du sous-dossier avec les outils Google Drive.
2. Appliquer le skill `cer-prosit` en entier (recherche, rédaction, .docx, grille de vérification, boucle « vérifie et améliore »). Ne jamais inventer de source.
3. Si un critère de la grille reste à « non », ou s'il manque `devoir.txt`, NE PAS déposer : écrire `a-relire.txt` dans le sous-dossier avec la raison, puis passer au suivant.
4. Déposer par l'API Moodle : `python moodle_depot.py --cmid <cmid> --fichier "<CER>.docx"` (dépôt définitif, remplace un fichier déjà remis). Si la connexion est refusée, s'arrêter tout de suite : ne jamais réessayer en boucle.
5. Téléverser dans le sous-dossier Drive : le .docx et `depose.txt` contenant la date, le statut Moodle affiché et les points à relire listés par le skill (verdicts « à confirmer », conflits retour/source, contexte inventé).

## Fin de passage
Résumer en quelques lignes : prosits déposés, prosits laissés en `a-relire`, erreurs.
