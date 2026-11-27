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

- Chaque membre peut avoir `documents_perso` : `{"aller": "perso/<id>/aller.pdf", "retour": "perso/<id>/retour.pptx"}` (chemins dans le dossier du prosit). **C'est son propre prosit aller ou retour : il fait foi pour sa version**, à la place de celui du groupe, pour la problématique, les pistes, le plan et les verdicts (même ordre de priorité : retour, aller, recherches). Les membres sans document perso utilisent ceux du groupe. Quand les versions s'appuient sur des documents différents, leurs problématiques, pistes ou verdicts peuvent légitimement diverger : le signaler dans `a_relire` (« version de X fondée sur son propre prosit aller »), et ne pas appliquer le contrôle de faits communs entre une version perso et une version de groupe.
- Si `numero` vaut `0`, le numéro du prosit n'a pas été reconnu : écrire « CER PROSIT » sans numéro sur la garde, dans l'en-tête, le titre du fichier et le nom du fichier (`CER_Prosit_<NOM>_<Prenom>.docx`), et ne jamais inventer de numéro.
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

Page de garde : « CER PROSIT N », sujet, sous-titre éventuel, puis seulement trois lignes : Rédigé par (le membre de cette version), Année académique, Établissement. **Jamais** de ligne « Groupe » ni « Membres du groupe », quel que soit le style de garde.

**I. RAPPEL DU PROSIT ALLER** — 1. Mots clés (8 à 14, chacun défini en une ligne) · 2. Contexte (3 à 5 phrases) · 3. Besoins · 4. Problématique (une question, en encadré) · 5. Contraintes · 6. Généralisation (une ligne) · 7. Pistes de solution (3 à 4, formulées comme des questions discutables) · 8. Plan d'action (5 à 8 étapes, verbes à l'infinitif).

**II. RÉALISATION DU PLAN D'ACTION** — introduction, puis une section par étape du plan, même numéro, même ordre, intitulé identique ou forme nominale (même forme partout). Chaque section : définition sourcée → explication → application au cas de l'énoncé → exemple concret. Au moins un tableau toutes les deux étapes, légendé « Tableau N – titre » au-dessus et cité dans le texte.

**III. VALIDATION DES PISTES DE SOLUTION** — pour chaque piste : « **Piste N : <énoncé exact>** », verdict, justification de 3 à 6 phrases appuyée sur la partie II et au moins une source.

**CONCLUSION** (120 à 200 mots) : répond explicitement à la problématique, rappelle chaque apport du plan, relie à la généralisation.

**BIBLIOGRAPHIE** : uniquement des sources réellement ouvertes. « Auteur ou organisme, « Titre », année, URL ». En dernier : « Texte du prosit « … » » (suivi du groupe seulement s'il est renseigné dans `prosit.json`) et, si fourni, « Prosit retour, séance du JJ/MM/AAAA ».

## Étapes

1. **Cadrer** : lire `prosit.json` et les documents ; relever problématique, notions, et « piste → verdict du retour → argument ».
2. **Prosit aller** : reprendre celui du groupe tel quel, ou le reconstruire (voir plus haut).
3. **Recherche** : 8 à 15 recherches web, une par notion ou étape. Sources primaires d'abord (normes ISO/IEEE, cours universitaires, organismes, livres de référence). Ne jamais inventer de référence, de chiffre ou de citation.
4. **Rédiger** II, III, conclusion, bibliographie : français correct, ton de rapport d'ingénieur, « nous » pour le groupe, sigles expliqués à leur première apparition, paraphrase (aucune phrase copiée), termes clés en gras, 6 à 10 pages hors garde.
5. **Mettre en forme** un .docx maître selon la charte, avec le skill docx.
6. **Décliner** : une version par membre.
   - **Fond commun, obligatoire** : mêmes mots clés, problématique, pistes, plan d'action, verdicts, sources, chiffres et tableaux (mêmes données). Le prosit aller et le retour du groupe restent la référence de tous.
   - **Contenu propre à chaque membre** : voir « Contenu propre à chaque membre » ci-dessous. Les versions ne se limitent pas à des phrases reformulées : l'angle, les exemples, les sources mises en avant, la construction des paragraphes et les tableaux diffèrent, sans qu'aucun fait ni verdict ne change.
   - **Thème propre à chaque membre** : appliquer `theme` (voir « Thèmes »).
   - Nom de fichier : `CER_Prosit_<N>_<NOM>_<Prenom>.docx` (sans accents ni espaces).
   - Les trois styles de garde (bandeau, sobre, colonne) ont le même tableau de trois lignes : Rédigé par, Année académique, Établissement.
7. **Vérifier** avec la grille, corriger, revérifier.
8. **Livrer** dans le dossier du prosit : les .docx par membre, et `livraison.json` : `{"statut": "pret" | "a-relire", "fichiers": {"<id_etudiant>": "<nom de fichier>"}, "a_relire": ["…"], "sources": N, "similarite_max": 0.xx}`. Le dépôt sur Moodle et les messages WhatsApp sont faits par le service, pas par ce skill.

## Contenu propre à chaque membre

Objectif : deux étudiants du même groupe ne rendent pas le même texte. Ce qui est **commun** ne change jamais ; ce qui est **propre** change réellement, pas seulement par synonymes.

**Commun, identique dans toutes les versions qui s'appuient sur les mêmes documents** (décisions du groupe et faits) : problématique, mots clés, pistes (énoncé complet), plan d'action (étapes et ordre), verdicts, chiffres, noms et sources réellement ouvertes. Aucun membre n'invente un fait, une source ou un verdict que les autres n'ont pas.

**Propre à chaque membre**, à faire varier dans les parties II, III, la conclusion et l'introduction de II :
1. **Angle d'application** : dans chaque étape, relier la notion à un moment ou un personnage différent de l'énoncé (chacun choisit sa scène, sans contredire l'énoncé).
2. **Exemple concret** : un exemple différent par étape, tiré de l'énoncé, des ressources du cours ou d'un domaine voisin appuyé par une source.
3. **Sources mises en avant** : chaque version cite l'ensemble des sources du groupe, mais s'appuie en priorité sur un sous-ensemble différent pour ses définitions ; la bibliographie reste commune.
4. **Construction** : plan interne des sous-parties (3.1, 3.2…) et ordre d'exposition de la définition, de l'explication et de l'application ; mise en avant d'un schéma ou d'un tableau différent.
5. **Tableaux** : mêmes données de fond, mais choix de colonnes, regroupements ou tableaux supplémentaires différents (par exemple un tableau comparatif chez l'un, une matrice chez l'autre), toujours légendés et cités.
6. **Justification des pistes** (III) : même verdict, arguments mis dans un ordre différent et appuyés sur des passages différents de la partie II.
7. **Conclusion** : mêmes apports, accents et enchaînements différents.

**Réglages du membre** (`theme.redaction`, tous facultatifs ; défaut entre crochets) :
| Clé | Valeurs | Effet |
|---|---|---|
| `ton` | formel, pedagogique, direct [formel] | formel : rapport d'ingénieur sobre ; pedagogique : explique avec des analogies courtes ; direct : phrases brèves, listes. |
| `detail` | concis, standard, approfondi [standard] | cible de pages hors garde : 6-7, 8-10, 11-13. |
| `angle` | technique, metier, mixte [mixte] | technique : architecture, outils, formalisation ; metier : parties prenantes, risques, organisation. |
| `exemples` | cas_enonce, autres_domaines [cas_enonce] | cas_enonce : exemples pris dans le cas du prosit ; autres_domaines : exemples d'autres secteurs, sourcés. |

**Sans réglage** (ou réglages identiques entre deux membres), différencier quand même : tirer une combinaison propre à chaque membre à partir de `id_etudiant` (par exemple, rang du membre trié par `id_etudiant` : 1er = angle technique et ton formel, 2e = angle metier et ton pedagogique, 3e = ton direct et exemples d'autres domaines, puis recommencer).

**Contrôle de différence** : après rédaction, lancer `python certain/similarite.py <dossier>` ; il compare les versions deux à deux. Seuil : moins de 30 % de paragraphes de II et III dont la ressemblance dépasse 0,8, et aucune partie II ou III entièrement identique. Au-delà, réécrire la version la plus proche d'une autre avec un autre angle ou d'autres exemples, puis relancer. Le script ne juge pas les faits : relire à part que les verdicts, chiffres et sources sont identiques.

## Thèmes (personnalisation propre à chaque membre)

`theme` vient du profil de l'étudiant sur le site. **Seule la forme change ; l'ordre et le contenu des parties restent ceux de la structure imposée.** Toute valeur absente ou inconnue prend la valeur par défaut (entre crochets), qui reproduit la charte ci-dessous.

| Clé | Valeurs | Rendu attendu |
|---|---|---|
| `police` | Calibri, Cambria, Georgia, Garamond, Times New Roman, Book Antiqua, Arial, Segoe UI, Lato, Century Gothic [Calibri] | Police du texte courant, des tableaux et des légendes. |
| `police_titres` | même liste [= `police`] | Titres 1/2/3, titre de la garde, sommaire. |
| `taille` | 10.5, 11, 12 [11] | Taille du texte courant (tableaux : taille − 1,5 pt). |
| `interligne` | 1, 1.15, 1.5 [1.15] | Interligne du texte courant. |
| `couleur_principale`, `couleur_accent` | hexadécimal 6 chiffres [2F3437, 0F766E] | Refuser (prendre le défaut) une couleur au contraste < 4,5:1 sur blanc. Teintes claires (encadré, ligne alternée) = accent mélangé à ~88 % de blanc. |
| `garde` | bandeau, sobre, colonne, centree, cadre, moderne [bandeau] | voir « Formes de garde ». |
| `titres` | filet, numero, bande, capitales, simple [filet] | **filet** : Titre 1 gras couleur principale + filet accent dessous. **numero** : numéro de partie en grand (28 pt, accent) à gauche du titre. **bande** : Titre 1 sur fond teinté pleine largeur. **capitales** : petites capitales espacées (+1,5 pt d'espacement). **simple** : gras, sans décor. |
| `numerotation` | romain, decimal, aucune [romain] | **romain** : I. / 1. / 1.1. **decimal** : 1. / 1.1 / 1.1.1 (les parties I, II, III deviennent 1, 2, 3). **aucune** : titres sans numéros (le plan d'action garde ses numéros d'étapes dans la liste, pas dans les titres). |
| `tableaux` | raye, grille, lignes, minimal [raye] | **raye** : en-tête plein couleur principale, une ligne sur deux teintée. **grille** : toutes les bordures fines. **lignes** : filets horizontaux seulement. **minimal** : en-tête texte couleur principale souligné, aucune autre bordure. |
| `encadres` | barre, fond, cadre [barre] | Problématique et pistes : **barre** épaisse accent à gauche + fond teinté, **fond** teinté seul, **cadre** contour fin accent. |
| `sommaire` | true, false [false] | true : page « Sommaire » juste après la garde, vrai champ TOC Word (niveaux 1-2) mis à jour, avec points de suite. |
| `pagination` | page_sur, numero, tiret, aucune [page_sur] | Pied centré : « Page X / Y » (PAGE, NUMPAGES), « X », « — X — », ou rien. Jamais sur la garde. |
| `entete` | complet, titre, aucun [complet] | **complet** : « CER Prosit N — Sujet » à gauche, « Prénom NOM » à droite. **titre** : partie gauche seule. **aucun** : pas d'en-tête. Jamais sur la garde. |
| `marges` | etroites, normales, larges [normales] | 1,8 cm, 2,2 cm, 2,6 cm. |

### Formes de garde
Toutes ont exactement trois informations en bas ou au centre : **Rédigé par**, **Année académique**, **Établissement**. Jamais « Groupe » ni « Membres du groupe ».
- **bandeau** : ligne du haut « Ucac-Icam · Année académique AAAA/AAAA » soulignée ; bandeau couleur principale pleine largeur avec « COMPTE RENDU » (10,5 pt, accent éclairci), « CER PROSIT N » (34 pt gras blanc), sujet (18 pt gras blanc) ; tableau d'infos sans bordures verticales en bas.
- **sobre** : même structure sur fond blanc, titre en couleur principale, filet accent épais sous le bloc titre.
- **colonne** : bande verticale accent (1,5 cm) sur toute la hauteur à gauche, contenu décalé, titre en couleur principale.
- **centree** : tout centré, « UCAC-ICAM » en petites capitales en haut, bloc titre entre deux filets accent au milieu de la page, infos centrées en bas (« Rédigé par : … » sur trois lignes).
- **cadre** : double filet (couleur principale + accent) encadrant la page à 1 cm des bords, contenu centré comme « centree ».
- **moderne** : numéro du prosit en très grand (120 pt, accent très éclairci) en haut à gauche, bloc titre chevauchant le bas du numéro avec une barre accent à gauche, infos en bas.

## Charte graphique (thème par défaut)

- A4, marges 2,2 cm. Calibri 11, justifié, interligne 1,15, 6 pt après. Texte 262626.
- Palette : anthracite 2F3437, pétrole 0F766E, lignes D5DADB, ligne alternée F4F6F6, encadré E7F3F1, gris 6B7275. Verdicts : vert 4D7C0F, orange B45309, rouge B91C1C. **Aucun bleu**, y compris dans les styles et le thème.
- Garde : ligne du haut « Ucac-Icam · Année académique AAAA/AAAA » soulignée ; bandeau anthracite pleine largeur avec « COMPTE RENDU » (10,5 pt, 7DD3C8), « CER PROSIT N » (34 pt gras blanc), sujet (18 pt gras blanc), sous-titre (13 pt italique D9DFE0) ; en bas, tableau sans bordures verticales Rédigé par / Année académique / Établissement (rien d'autre).
- Pages suivantes : en-tête « CER Prosit N — Sujet » à gauche (gras), « Prénom NOM » à droite, filet dessous ; pied « Page X / Y » centré. Pas d'en-tête sur la garde.
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
9. Une version par membre de `prosit.json` : bon nom sur la garde, dans l'en-tête et les propriétés ; garde sans ligne « Groupe » ni « Membres du groupe » ; **chaque clé du `theme` du membre visiblement appliquée** (garde, titres, numérotation, tableaux, encadrés, sommaire, pagination, en-tête, marges, polices) ; thème du membre appliqué ; contenu propre à chaque membre (angle, exemples, sources mises en avant, construction et tableaux différents ; `similarite.py` sous le seuil) ; mêmes pistes, verdicts, sources et chiffres dans toutes les versions.
10. Corrections du tuteur intégrées ; écarts avec le retour listés dans `a_relire`.
11. Les versions sont différentes sur le fond (angle, exemples) et **identiques sur les faits** : mêmes pistes, verdicts, chiffres, sources, problématique et plan ; `livraison.json` indique le résultat de `similarite.py`.
