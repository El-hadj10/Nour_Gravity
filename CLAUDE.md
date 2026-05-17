# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Langue

Le projet est rédigé en français (README, commentaires, prompts système Anthropic, UI). Réponds et commente en français sauf demande contraire.

## Commandes

```bash
npm install          # installer les dépendances
node server.js       # démarrer le serveur sur http://localhost:3000
```

Pas de scripts `start`, de tests, ni de linter configurés (`npm test` est un stub par défaut). Variables d'environnement attendues dans `.env` à la racine :

- `NOUR_GRAVITY_API_KEY` — clé Anthropic (obligatoire pour les routes IA)
- `PORT` — facultatif, défaut `3000`

Vérification rapide du serveur : `curl http://localhost:3000/health`.

## Architecture

Application monolithique Node/Express qui sert un front statique et proxyfie l'API Anthropic. Trois fichiers font tourner le système ; les autres (`src/js/api.js`, `src/css/style.css`) sont des placeholders vides.

**`server.js`** — Express 5. Sert `src/` en statique et expose deux routes POST qui appellent Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`). Chaque route impose dans son `system` prompt un **format JSON brut sans markdown** ; le front fait `JSON.parse(result.raw)` directement, donc toute dérive de format casse l'UI. Le client Anthropic n'est instancié que si la clé est présente — sinon les routes renvoient 500. Le middleware fallback final (`app.use((_req, res) => res.sendFile(...))`) renvoie `index.html` pour toute URL inconnue (SPA-like).

- `POST /api/flux-invocation` — génère un attribut séquentiel de la « matrice INVOCATION 99 ». Schéma JSON attendu : `{name, type, arabic, transliteration, meaning}` où `type ∈ {ACTION, LÉGISLATION, LUMIÈRE, SOUVERAINETÉ}` (le front mappe ces 4 valeurs à des couleurs Tailwind dans `main.js`).
- `POST /api/invocation-finale` — prend `{probleme: string}` et génère une invocation curative sur-mesure. Schéma JSON : `{problem_targeted, arabic, transliteration, final_essence}`. Température basse (0.4) pour une réponse plus ciblée vs 0.5 pour le flux séquentiel.

**`src/index.html`** — page unique, Tailwind via CDN (`cdn.tailwindcss.com` — pas de build step). Couches superposées : (1) `#boot-overlay` qui disparaît après init, (2) `<canvas id="neural-canvas">` plein-écran en `position: fixed`, (3) `.hud-corner` × 4 et `.scan-line`, (4) header + main par-dessus. Deux zones interactives : table « Matrice Invocation 99 » et bloc « Résolution & Invocation Finale Personnalisée ». Le champ `<input type="password">` de clé API en haut à gauche est **purement décoratif** — la vraie clé vient du `.env` côté serveur. Badge `#neural-status` dans le header reflète l'état temps réel (`ONLINE` / `SYNCING` / `ALCHEMY` / `LINK LOST`).

**`src/js/neural.js`** — moteur du champ neuronal 5D. Expose `window.NourNeural.mount(canvasId) → NeuralField`. Constantes dans `CONFIG` (nb de nœuds desktop/mobile, rayon de connexion, force du curseur, profondeur, focale). Nœuds en (x, y, z) avec rotation continue + cible inclinée par la position souris ; projection perspective via `focal / (focal + z)`. Synapses dessinées entre voisins dont la distance projetée < `connectionRadius`, alpha modulé par distance × profondeur. Émission probabiliste de `pulses` qui traversent les synapses et activent le nœud cible (`energy` retombe en 0.94/frame). Champ de force du curseur : répulsion radiale dans `mouseInfluence` px déforme les positions projetées et amorce les nœuds proches. Méthode `burst(x, y, energy)` propage une onde d'activation depuis un point écran — appelée depuis `main.js` quand une réponse API arrive.

**`src/js/main.js`** — orchestration front. Au `DOMContentLoaded` :
1. `runBootSequence()` — fait défiler 5 logs Jarvis dans `#boot-log` puis ajoute `.gone` à l'overlay.
2. `neuralField = NourNeural.mount('neural-canvas')` — démarre le canvas et le garde en variable module-level pour les bursts.
3. `initAntigravityEffects()` — micro-rotations 3D au survol sur `.backdrop-blur-xl`.
4. `initApiFlux()` — bouton « Générer via l'API » ; compteur global `invocationStep` injecté dans le prompt (paire/impaire change la thématique). Au succès : ajoute une ligne avec classe `fresh-row` (glow), `typewrite()` sur la cellule meaning, `neuralBurstFromElement(newRow, 0.9)`. Compteur **non persisté** (rechargement = reset à 1).
5. `initInvocationFinaleFlux()` — bouton de résolution ; **écrase** la ligne précédente (`finalTableBody.innerHTML = ''`) au lieu d'accumuler, contrairement au flux 1. Même pattern typewriter + burst.

Helpers partagés : `setNeuralStatus(label, color)` met à jour le badge HUD, `typewrite(el, text, speed)` révèle un texte avec caret clignotant, `neuralBurstFromElement(el, energy)` calcule le centre écran de l'élément et appelle `neuralField.burst()`.

**`src/css/style.css`** — couche HUD au-dessus de Tailwind. Variables `--jarvis-cyan`, `--jarvis-amber`, `--jarvis-bg`. Définit `#neural-canvas` (fixed, full-screen, `mix-blend-mode: screen`), vignette via `body::before`, `.hud-corner`, `.scan-line` (animée via `transform: translate3d` — surtout **pas** `top`, perf), `.boot-overlay` avec `.gone`, `.typewriter`/`.caret`, `tr.fresh-row` (animation `fresh-glow`), scrollbar custom, halo des boutons.

## Pièges connus

- Le front `JSON.parse` la sortie Claude sans garde — si tu modifies un `system` prompt, garde le JSON brut sans backticks ni markdown.
- Le sélecteur `document.querySelector('tbody')` dans `initApiFlux` cible le **premier** `<tbody>` du document. Si tu réordonnes le HTML pour placer la table finale avant la table 99, le flux séquentiel écrira dans la mauvaise table.
- Tailwind est chargé via CDN runtime : pas de purge, pas de build. Les classes générées dynamiquement en JS (ex. `text-cyan-400`) doivent rester en littéraux pour être détectées.
- Le canvas neuronal utilise `position: fixed` + `z-index: 0` et le contenu (`header`, `main`, `.hud-layer`) doit rester en `z-index: 10`. Toute nouvelle section interactive doit être ajoutée dans cette pile, sinon elle passera derrière le canvas (qui est en `pointer-events: none` donc cliquable au travers, mais visuellement masquée).
- Le diagnostic Edge Tools signale des warnings « Composite/Paint » sur les `@keyframes` animant `transform`/`opacity` : c'est du bruit, ces propriétés sont les plus performantes à animer. Ne pas régresser vers `top`/`left` pour « régler » ces warnings.
- `.env` est gitignoré ; ne jamais committer la clé.
