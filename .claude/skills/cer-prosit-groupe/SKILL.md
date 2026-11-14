---
name: cer-prosit-groupe
description: "Construire le CER (compte rendu de prosit) commun d'un groupe d'étudiants Ucac-Icam, puis une version propre à chaque membre (son thème graphique et sa propre rédaction, mêmes faits et mêmes verdicts), à partir de l'énoncé, du prosit aller et du prosit retour. Pour le service multi-étudiants ; distinct du skill personnel cer-prosit."
---

# CER de prosit pour un groupe — un fond commun, une version par membre

À utiliser par le service CER quand un prosit est déposé pour un groupe. Ce skill ne contient **aucune identité en dur** : les membres changent d'un prosit à l'autre et sont fournis à chaque fois.

Contexte : à l'Ucac-Icam, un prosit se déroule en pédagogie par problème. Le groupe fait le prosit aller (mots clés, problématique, pistes, plan d'action), chacun fait les recherches, puis le prosit retour valide ou invalide les pistes. Le CER est le compte rendu écrit de ce travail : il n'est pas noté, il sert à garder une trace et à améliorer les prosits suivants. Il est commun au groupe et chaque membre le rend à son nom.

## Entrées (un dossier par prosit)

| Fichier | Obligatoire | Contenu |
|---|---|---|
| `prosit.json` | oui | `{"numero": 3, "notion": "…", "cours": "GLOG461", "cmid": 4957, "groupe": "Groupe 2", "annee": "2026/2027", "membres": [{"nom": "MASSOMA", "prenoms": "Edouard Matt-Dieter", "id_etudiant": "…", "theme": {…}}, …]}` (voir « Thèmes ») |
| `enonce` | fortement conseillé | texte du prosit |
| `aller` | non | prosit aller du groupe |
| `retour` | fortement conseillé | verdicts des pistes, corrections du tuteur, ressources |

- `membres` est la composition **pour ce prosit**. Ne jamais la reprendre d'un prosit précédent.
- `id_etudiant` est l'identifiant interne du service (lien vers le jeton Moodle chiffré). Le skill ne lit ni ne manipule jamais de jeton ou de mot de passe.
- Établissement : toujours « Ucac-Icam » écrit ainsi.
- Si `prosit.json` manque ou n'a ni numéro, ni notion, ni au moins un membre : ne rien produire, écrire `a-relire.txt` avec la raison.

## Ordre de priorité des sources

1. **Prosit retour** : ce qui a été validé en séance fait foi.
2. **Prosit aller du groupe** : mots clés, problématique, pistes et plan tels que décidés.
3. **Recherches** : elles étayent et complètent, sans jamais contredire en silence les deux premiers.

Règles pour le retour :
- **Verdicts** ramenés à l'une des quatre formules : « Validée. » ; « Validée sous condition. » (partiellement, sous réserve, à nuancer, vraie mais incomplète) ; « Non validée telle quelle. » (mal formulée, trop absolue) ; « Invalidée. » (fausse, rejetée). Justification reprise du retour, étayée par au moins une source.
- **Corrections du tuteur** intégrées dans la partie II, à l'étape concernée ; une notion nouvelle devient une sous-partie de l'étape la plus proche.
- **Pistes ajoutées en séance** : « Piste N (ajoutée au retour) : … » en partie III uniquement.
- **Conflit retour / source fiable** : suivre le retour, signaler le conflit dans `a-relire` de la livraison.
- **Retour incomplet** : verdict tiré des recherches, marqué « à confirmer ».
- Sans aller : le reconstruire à partir du retour s'il existe, sinon de l'énoncé, sans inventer de pistes.

## Structure imposée

Page de garde : « CER PROSIT N », sujet, sous-titre éventuel, rédigé par (le membre de cette version), groupe, année académique, établissement. Une ligne « Membres du groupe : … » liste tous les membres.

**I. RAPPEL DU PROSIT ALLER** — 1. Mots clés (8 à 14, chacun défini en une ligne) · 2. Contexte (3 à 5 phrases) · 3. Besoins · 4. Problématique (une question, en encadré) · 5. Contraintes · 6. Généralisation (une ligne) · 7. Pistes de solution (3 à 4, formulées comme des questions discutables) · 8. Plan d'action (5 à 8 étapes, verbes à l'infinitif).

**II. RÉALISATION DU PLAN D'ACTION** — introduction, puis une section par étape du plan, même numéro, même ordre, intitulé identique ou forme nominale (même forme partout). Chaque section : définition sourcée → explication → application au cas de l'énoncé → exemple concret. Au moins un tableau toutes les deux étapes, légendé « Tableau N – titre » au-dessus et cité dans le texte.

**III. VALIDATION DES PISTES DE SOLUTION** — pour chaque piste : « **Piste N : <énoncé exact>** », verdict, justification de 3 à 6 phrases appuyée sur la partie II et au moins une source.

**CONCLUSION** (120 à 200 mots) : répond explicitement à la problématique, rappelle chaque apport du plan, relie à la généralisation.

**BIBLIOGRAPHIE** : uniquement des sources réellement ouvertes. « Auteur ou organisme, « Titre », année, URL ». En dernier : « Texte du prosit « … », <groupe> » et, si fourni, « Prosit retour, séance du JJ/MM/AAAA, <groupe> ».

## Étapes

1. **Cadrer** : lire `prosit.json` et les documents ; relever problématique, notions, et « piste → verdict du retour → argument ».
2. **Prosit aller** : reprendre celui du groupe tel quel, ou le reconstruire (voir plus haut).
3. **Recherche** : 8 à 15 recherches web, une par notion ou étape. Sources primaires d'abord (normes ISO/IEEE, cours universitaires, organismes, livres de référence). Ne jamais inventer de référence, de chiffre ou de citation.
4. **Rédiger** II, III, conclusion, bibliographie : français correct, ton de rapport d'ingénieur, « nous » pour le groupe, sigles expliqués à leur première apparition, paraphrase (aucune phrase copiée), termes clés en gras, 6 à 10 pages hors garde.
5. **Mettre en forme** un .docx maître selon la charte, avec le skill docx.
6. **Décliner** : une version par membre.
   - **Fond commun, obligatoire** : mêmes mots clés, problématique, pistes, plan d'action, verdicts, sources, chiffres et tableaux (mêmes données). Le prosit aller et le retour du groupe restent la référence de tous.
   - **Rédaction propre à chaque membre** : reformuler les parties II, III et la conclusion (tournures, ordre des phrases, exemples concrets choisis parmi ceux qu'appuient les sources), sans ajouter d'affirmation non sourcée ni changer un verdict. Les définitions de la partie I peuvent rester proches.
   - **Thème propre à chaque membre** : appliquer `theme` (voir « Thèmes »).
   - Nom de fichier : `CER_Prosit_<N>_<NOM>_<Prenom>.docx` (sans accents ni espaces).
7. **Vérifier** avec la grille, corriger, revérifier.
8. **Livrer** dans le dossier du prosit : les .docx par membre, et `livraison.json` : `{"statut": "pret" | "a-relire", "fichiers": {"<id_etudiant>": "<nom de fichier>"}, "a_relire": ["…"], "sources": N}`. Le dépôt sur Moodle et les messages WhatsApp sont faits par le service, pas par ce skill.

## Thèmes

`theme` (choisi par l'étudiant sur le site) : `{"police": "Calibri", "couleur_principale": "2F3437", "couleur_accent": "0F766E", "garde": "bandeau" | "sobre" | "colonne"}`.
- Sans `theme` : appliquer le thème par défaut ci-dessous (anthracite + pétrole, garde « bandeau »).
- Polices autorisées : Calibri, Cambria, Georgia, Arial, Segoe UI, Garamond. Toute autre valeur → Calibri.
- Couleurs : hexadécimal à 6 chiffres. Refuser (et prendre le défaut) une couleur trop claire pour du texte sur blanc (contraste inférieur à 4,5:1) ; les teintes claires dérivées (encadré, ligne alternée) sont calculées à partir de l'accent (environ 90 % vers le blanc).
- Couleurs des verdicts fixes pour tous (vert 4D7C0F, orange B45309, rouge B91C1C) pour rester lisibles.
- Gardes : « bandeau » = bandeau pleine largeur décrit ci-dessous ; « sobre » = fond blanc, titre en couleur principale, filet accent ; « colonne » = bande verticale accent à gauche sur toute la hauteur.
- Tout le reste de la charte (mise en page, titres, tableaux, légendes, en-têtes) reste commun.

## Charte graphique (thème par défaut)

- A4, marges 2,2 cm. Calibri 11, justifié, interligne 1,15, 6 pt après. Texte 262626.
- Palette : anthracite 2F3437, pétrole 0F766E, lignes D5DADB, ligne alternée F4F6F6, encadré E7F3F1, gris 6B7275. Verdicts : vert 4D7C0F, orange B45309, rouge B91C1C. **Aucun bleu**, y compris dans les styles et le thème.
- Garde : ligne du haut « Ucac-Icam · Année académique AAAA/AAAA » soulignée ; bandeau anthracite pleine largeur avec « COMPTE RENDU » (10,5 pt, 7DD3C8), « CER PROSIT N » (34 pt gras blanc), sujet (18 pt gras blanc), sous-titre (13 pt italique D9DFE0) ; en bas, tableau sans bordures verticales Rédigé par / Membres / Groupe / Année / Établissement.
- Pages suivantes : en-tête « CER Prosit N — Sujet » à gauche (gras), « Prénom NOM · Groupe » à droite, filet dessous ; pied « Page X / Y » centré. Pas d'en-tête sur la garde.
- Titres : styles Titre 1/2/3 (17 pt gras anthracite + filet pétrole + saut de page avant I, II, III ; 13,5 pt gras pétrole ; 11,5 pt gras anthracite), liés au paragraphe suivant.
- Listes : vraie numérotation Word, puces et numéros pétrole, repart à 1 à chaque liste.
- Tableaux : pleine largeur, en-tête anthracite texte blanc gras 9,5 pt répété, lignes alternées, première colonne en gras, texte 9,5 pt ; tableaux de 12 lignes ou moins jamais coupés, aucune ligne coupée.
- Légendes : « Tableau N » gras pétrole + titre italique gris, 9,5 pt, au-dessus, liées au tableau.
- Problématique : encadré E7F3F1, barre pétrole épaisse à gauche, étiquette « PROBLÉMATIQUE » en petites capitales, question en italique ; marqué cantSplit.
- Pistes (III) : barre pétrole à gauche, intitulé gras, verdict gras dans sa couleur.
- Propriétés : auteur = membre de la version ; titre = « CER Prosit N – Sujet ».

Pièges : les modèles python-docx contiennent des bleus cachés (styles, thème, stylesWithEffects.xml) — recolorer ou partir de docx-js ; respecter l'ordre des éléments dans tblPr, tcPr et trPr.

## Grille de vérification (tout doit être « oui », sinon statut « a-relire »)

1. Les 8 rubriques de l'aller sont présentes, dans l'ordre.
2. Chaque étape du plan a sa section en II, même numéro, même ordre ; aucune section hors plan.
3. Chaque piste de I réapparaît en III, énoncé complet, verdict, justification renvoyant à II ; verdicts du retour respectés.
4. La conclusion reprend les termes de la problématique.
5. Chaque source a été réellement ouverte ; chaque chiffre est sourcé ; aucune référence inventée.
6. Chaque sigle est expliqué à sa première apparition.
7. Tous les tableaux sont numérotés, légendés et cités.
8. Rendu regardé page par page (PDF puis images) : garde correcte, aucun bleu, en-tête et pied dès la page 2 ; le validateur docx passe.
9. Une version par membre de `prosit.json` : bon nom sur la garde, dans l'en-tête et les propriétés ; thème du membre appliqué ; rédaction différente d'une version à l'autre (aucun paragraphe de II ou III identique) ; mêmes pistes, verdicts, sources et chiffres dans toutes les versions.
10. Corrections du tuteur intégrées ; écarts avec le retour listés dans `a_relire`.
