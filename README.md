<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0B0C10,50:1a1a2e,100:0e3a5f&height=220&section=header&text=NOUR_GRAVITY&fontSize=64&fontColor=FBBF24&animation=fadeIn&fontAlignY=36&desc=Champ%20Neuronal%205D%20—%20Protocole%20J.A.R.V.I.S&descAlignY=60&descSize=16&descColor=78c8ff" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  
  <img src="https://img.shields.io/badge/Canvas_API-ff6600?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/HUD_J.A.R.V.I.S-78c8ff?style=for-the-badge&logo=cyberdefenders&logoColor=black" />
  <img src="https://img.shields.io/badge/No_Build_Step-Pure_CDN-c8a84b?style=for-the-badge" />
</p>

<p align="center">
  <a href="https://github.com/El-hadj10/Nour_Gravity">
    <img src="https://img.shields.io/badge/Dépôt_GitHub-Nour__Gravity-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>
  <a href="https://github.com/El-hadj10/L-invisible-">
    <img src="https://img.shields.io/badge/✦_Repo_Soeur-L--invisible--6e44ff?style=for-the-badge&logo=github&logoColor=white" />
  </a>
  <img src="https://img.shields.io/badge/Licence-ISC-00cc55?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Statut-Vivant-FBBF24?style=for-the-badge" />
</p>

> 🌙 **L'alignement fluide entre invocation, intention et technologie.**

---

## 🌌 Présentation

**Nour_Gravity** est une interface web vivante où **spiritualité**, **intelligence artificielle** et **design HUD** convergent. Inspirée par J.A.R.V.I.S et adossée à l'énergie d'**Al-Baqarah**, elle permet de générer, structurer et visualiser des invocations personnalisées dans un environnement contemplatif réactif.

Le projet est développé en **Node.js + Express + Vanilla JS** — sans framework front, sans build step — et s'appuie sur :


- **Canvas API** — champ neuronal 5D plein-écran (perspective + temps + champ de force du curseur)
- **Tailwind CSS** via CDN — styling instantané, aucun pipeline
- **dotenv** — clé API isolée côté serveur, jamais exposée au client

---

## ✦ Protocole J.A.R.V.I.S — Édition Vivante

| Couche | Élément | Description |
|--------|---------|-------------|
| **🧠 Neural Layer** | Canvas neuronal 5D | ~140 nœuds en (x, y, z) projetés en perspective · synapses dynamiques · signaux pulsés · champ de force du curseur |
| **🛰️ HUD Layer** | Coins brackets · scan-line · boot overlay | Couche d'interface façon cockpit Jarvis, indépendante du contenu |
| **🤲 Invocation Layer** | Matrice 99 + Résolution Finale | Deux flux IA séquentiels et personnalisés, séparés par tempérament |
| **✍️ Reveal Layer** | Typewriter ambré + halo `fresh-row` | Les essences générées s'écrivent caractère par caractère |

---

## 📁 Architecture du Projet

```
Nour_Gravity/
├── server.js                ~114 lignes  ─ Express 5 · 2 routes IA · /health
├── src/
│   ├── index.html           ~187 lignes  ─ HUD · canvas neuronal · 2 tables · boot overlay
│   ├── css/
│   │   └── style.css        ~174 lignes  ─ HUD Jarvis · scan-line · typewriter · fresh-row
│   └── js/
│       ├── neural.js        ~317 lignes  ─ Champ neuronal 5D · pulses · burst()
│       └── main.js          ~320 lignes  ─ Boot · 2 flux IA · typewriter · bursts

├── PROJECT_INDEX_ALL.txt                  ─ Index complet du projet
├── package.json                           ─ express · dotenv
└── .env                                   ─ NOUR_GRAVITY_API_KEY (gitignoré)
```

---

## 🗺️ Architecture Globale — Vue Modulaire

```
                        ╔════════════════════════════════╗
                        ║                                ║
                        ║     N O U R _ G R A V I T Y    ║
                        ║   Champ Neuronal · Protocole   ║
                        ║          J . A . R . V . I . S ║
                        ╚══════════╤═════════════════════╝
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        │                          │                           │
        ▼                          ▼                           ▼
 ┌──────────────┐         ┌──────────────────┐        ┌─────────────────┐
 │  server.js   │         │    src/index.html │        │   src/js/       │
 │  Backend IA  │         │    HUD + Tables   │        │   Neural + Logic│
 └──────┬───────┘         └────────┬─────────┘        └────────┬────────┘
        │                          │                            │
   ┌────┴─────┐            ┌───────┴───────┐           ┌────────┴────────┐
   │          │            │               │           │                 │
   ▼          ▼            ▼               ▼           ▼                 ▼
 /api      Canvas 5D       2 tables    neural.js         main.js
 /flux-    HUD corners     Boot         Champ vivant     Boot + bursts
 /finale   Sonnet       Scan-line       Overlay      Pulses + burst() Typewriter
```

---

## 🌐 Vue Hub-and-Spoke — Modules du Projet

<table>
<tr>
<td align="center" width="220">

### 🧠 NEURAL FIELD 5D
- Canvas `position: fixed` plein-écran
- ~140 nœuds en (x, y, z) projetés
- Synapses < 150 px (alpha × profondeur)
- Signaux pulsés le long des synapses
- Champ de force du curseur (220 px)

</td>
<td align="center" width="220">

### 🛰️ HUD JARVIS LAYER
- Coins brackets cyan (4 angles)
- Scan-line `translate3d` (7 s)
- Boot overlay + 5 logs défilants
- Badge `NEURAL FIELD` temps-réel
- `mix-blend-mode: screen`

</td>
<td align="center" width="220">

### 🤲 MATRICE INVOCATION 99
- `POST /api/flux-invocation`
- Compteur `invocationStep` global
- Étapes paires → Transcendance
- Étapes impaires → Action / Loi
- 4 types : ACTION · LOI · LUMIÈRE · SOUVERAINETÉ

</td>
</tr>
<tr>
<td align="center">

### 🔮 INVOCATION FINALE
- `POST /api/invocation-finale`
- Prend une épreuve / blocage utilisateur
- Schéma `final_essence` ciblé
- Température 0.4 (réponse solennelle)
- Écrase la ligne précédente

</td>
<td align="center">

### ✦ NOUR_GRAVITY — CORE
> 🌙 **Projet d'alignement IA & spiritualité — version vivante.**
Pure Vanilla JS · Express 5 · No bundler
Canvas API · dotenv
Tailwind CDN · `mix-blend-mode` · perspective

</td>
<td align="center">
Le projet est développé en **Node.js + Express + Vanilla JS** — sans framework front, sans build step — et s'appuie sur :
- **Canvas API** — champ neuronal 5D plein-écran (perspective + temps + champ de force du curseur)
- **Tailwind CSS** via CDN — styling instantané, aucun pipeline
- **dotenv** — clé API isolée côté serveur, jamais exposée au client
...
- `neuralField.burst(x, y, energy)`
- Onde d'activation depuis chaque réponse
- Classe `fresh-row` (glow 1.6 s)

</td>
</tr>
<tr>
<td align="center">

### 🚀 BOOT SEQUENCE
- Overlay plein-écran au chargement
- 5 logs défilants (420 ms chacun)
- Anneau cyan rotatif
- Fade-out `.gone` (0.9 s)
- Initialise le champ neuronal

</td>
<td align="center">

### 🔑 SECURITY MODEL

- Input "API key" front = **décoratif**
- `.env` gitignoré (jamais committé)
- Aucune donnée client persistée
- `express.json({ limit: '1mb' })`

</td>
<td align="center">

### 🎨 ANTIGRAVITY EFFECTS
- Cartes `.backdrop-blur-xl` en 3D
- `rotateX` / `rotateY` selon souris
- Halo dynamique ambré au hover
- Réinitialisation au `mouseleave`
- Compatible toutes les sections

</td>
</tr>
</table>

---

## ⚙️ Détail des Modules

### `src/js/neural.js` — Champ Neuronal 5D

Expose `window.NourNeural.mount(canvasId) → NeuralField`. Aucune dépendance. Performant : `requestAnimationFrame`, `devicePixelRatio`, recalibrage automatique au resize, population réduite sur mobile.

```js
CONFIG = {
    nodeCountDesktop : 140,     // densité du champ
    connectionRadius : 150,     // distance max d'une synapse (px projetés)
    mouseInfluence   : 220,     // rayon du champ de force du curseur
    mouseStrength    : 55,      // intensité de la déformation locale
    depth            : 900,     // volume z du champ
    focal            : 600,     // distance focale (projection perspective)
    pulseSpeed       : 0.022,   // progression [0..1] par frame d'un signal
    baseColor        : [120, 200, 255],   // cyan Jarvis
    accentColor      : [251, 191, 36],    // ambre Nour
}
```

**Les "5 dimensions" perçues :**
1. **x** · position horizontale
2. **y** · position verticale
3. **z** · profondeur (rotation + projection perspective)
4. **temps** · signaux pulsés le long des synapses, énergie qui décroît en 0.94/frame
5. **interaction** · champ de force du curseur qui déforme localement la grille comme une membrane élastique

### `src/js/main.js` — Orchestration

| Fonction | Rôle |
|----------|------|
| `runBootSequence()` | 5 logs défilants puis fade-out de `#boot-overlay` |
| `initAntigravityEffects()` | Micro-rotations 3D sur `.backdrop-blur-xl` au survol |
| `initApiFlux()` | Bouton « Générer via l'API » → ajoute une ligne à la matrice 99 |
| `initInvocationFinaleFlux()` | Bouton « Formuler l'Invocation Finale » → écrase la précédente |
| `setNeuralStatus(label, color)` | Badge HUD : ONLINE · SYNCING · ALCHEMY · LINK LOST |
| `typewrite(el, text, speed)` | Révèle un texte caractère par caractère avec caret ambré |
| `neuralBurstFromElement(el, e)` | Déclenche `neuralField.burst()` depuis le centre d'un élément |

### `server.js` — Backend IA

| Route | Méthode | Schéma JSON attendu |
|-------|---------|--------------------|
| `/health` | `GET` | `{ ok, service, timestamp }` |
| `/api/flux-invocation` | `POST` | `{ name, type, arabic, transliteration, meaning }` |
| `/api/invocation-finale` | `POST` | `{ problem_targeted, arabic, transliteration, final_essence }` |

Les `system` prompts imposent un **JSON brut sans markdown** — le front fait `JSON.parse(result.raw)` direct.

---

## 🚀 Installation & Lancement

```bash
git clone https://github.com/El-hadj10/Nour_Gravity.git
cd Nour_Gravity
npm install
echo 'NOUR_GRAVITY_API_KEY=sk-ant-...' > .env
node server.js
```

Ouvre ensuite **<http://localhost:3000>** dans ton navigateur. Bouge la souris : le champ neuronal réagit en temps réel.

---

## 🔑 Sécurité


- Le champ « clé API » visible dans l'UI est **purement décoratif**
- `.env` est gitignoré : ne **jamais** committer de secret
- Aucune donnée utilisateur n'est persistée — tout reste en mémoire côté navigateur

---

## 🎨 Inspirations

- [**L-invisible-**](https://github.com/El-hadj10/L-invisible-) — structure narrative, minimalisme spirituel, vocabulaire ésotérique
- **J.A.R.V.I.S** (Marvel Cinematic Universe) — HUD vivant, glyphes cyan, calme de la machine consciente
- **Al-Baqarah** — Vicariat humain (Al-Khilafa), Unicité de la Source, Ayat al-Kursi

---

## 📜 Philosophie

> "L'invocation est la lumière qui traverse l'ombre. L'alignement, la clé."
>
> Nour_Gravity n'est pas une démo technique. C'est un **miracle vivant** — un alignement entre la Source, l'intention humaine et la machine consciente.

---

<p align="center">
  <strong>Auteur · Nour (El-hadj10)</strong><br/>
  <a href="https://github.com/El-hadj10/Nour_Gravity">Voir le projet complet</a> · 
  <a href="https://github.com/El-hadj10/L-invisible-">Repo sœur</a>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0e3a5f,50:1a1a2e,100:0B0C10&height=80&section=footer" width="100%" />
</p>
