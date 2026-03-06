# Executive Summary

## Project Vision

Campaign TOW est une application web responsive de suivi de campagne Warhammer:
The Old World pour un club fermé de ~15 joueurs. Elle s'intègre dans le rituel
existant sans le remplacer : le calcul papier à table reste intact, l'app mémorise
ce qui a été décidé et le rend visible à tous. Elle couvre deux moments distincts —
référence instantanée pendant la partie, et carnet de campagne vivant après la
partie. L'app attend le joueur : elle n'impose rien.

La vue centrale n'est pas un tableur — c'est une timeline narrative scrollable.
Après 3-4 parties, un joueur scrolle et voit l'histoire complète de sa campagne
d'un seul regard.

## Target Users

**Joueur de campagne** (~10-12 joueurs) : Passionné Warhammer TOW, mobile à table
(éclairage variable, mains occupées), saisie post-match différée (bus, chez soi).
Niveau tech intermédiaire. Frustration actuelle : notes papier perdues, aucun
historique partagé. Moment "aha" : après 3-4 parties, il scrolle sa timeline et
voit l'histoire complète de son armée.

**Ben — Admin-Joueur** (1 utilisateur) : Organisateur + joueur. Setup initial
(import OWB, création comptes), puis joueur ordinaire. Source de vérité centralisée
sur l'état de chaque armée.

## Key Design Challenges

1. **Vitesse d'accès à table** : navigation évidente, pas réfléchie — 2 taps
   max pour sa propre armée depuis l'accueil
2. **Lisibilité en conditions de jeu** : éclairage variable, contrastes élevés,
   zones de tap ≥ 44px, aucune interaction hover-only
3. **Flow post-match engageant** : transformer la saisie XP en moment de récompense
   — le palier franchi doit être un événement visuel, pas une case à cocher

## Design Opportunities

1. **Le moment "palier" comme expérience** : mise en emphase visuelle lors du
   franchissement d'un seuil XP — le choix d'amélioration devient le temps fort
   après une partie
2. **Différenciation chromatique instantanée** : bonus (vert) / malus (rouge) sur
   les fiches d'unité, lisibles en un coup d'œil sans lecture
3. **Onboarding zéro friction** : armée déjà chargée à la première connexion —
   la valeur est immédiate

---
