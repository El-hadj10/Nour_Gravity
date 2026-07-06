# J.A.R.V.I.S — Bus de Délégation · Rapport d'implémentation

> 🌙 *« Analyse en cours, monsieur. »* — Ce document décrit la transformation
> du projet Nour_Gravity en un **assistant personnel J.A.R.V.I.S** capable
> d'interpréter des instructions (voix ou texte), de les router vers un
> bus d'agents spécialisés et de répondre avec une **trace visuelle HUD**.

---

## 1. Vision

Nour_Gravity était jusqu'ici une **web app contemplative** (champ neuronal
Canvas 5D + matrice d'invocations + invocation finale). L'objectif de cette
transformation est de faire de cette même interface un **noyau cognitif** :

| Couche            | Avant                            | Après (J.A.R.V.I.S)                                  |
| ----------------- | -------------------------------- | ----------------------------------------------------- |
| `index.html`      | matrice d'invocation + finale    | + **Console J.A.R.V.I.S** (zone de logs + input)      |
| `main.js`         | bouton micro décoratif           | micro → `jarvisConsole.submit(transcript)`             |
| `server.js`       | 2 routes IA désactivées (501)    | + 3 routes J.A.R.V.I.S + **in-process JS agents**    |
| `/jarvis/`        | (inexistant)                     | nouveaux modules : `delegator.js` (intent + agents)   |
| Sous-process      | (inexistant)                     | spawn `tsx ../chasseur-onirique/src/index.ts --task …` |

L'**intelligence n'est plus dans la page** mais dans le **bus de délégation**
situé côté serveur Express — la page se contente de parler au bus.

---

## 2. Architecture Système

```text
┌───────────────────────────────────────────────────────────────────────┐
│ NAVIGATEUR (zero build, CDN Tailwind, Web Speech API)                  │
│                                                                       │
│   index.html          ┌──────────────────────────────┐               │
│   ┌──────────────┐    │ Console HUD J.A.R.V.I.S       │               │
│   │ neural-canvas│◄───┤ #jarvis-logs + #jarvis-input   │               │
│   │  (5D field)  │burst│   ↑ submission                │               │
│   └──────────────┘    │   └ onTranscript (voix)        │               │
│                       └──────────────┬────────────────┘               │
│       jarvis-console.js              │ fetch (POST /api/jarvis/…)     │
│       main.js (init)                 │                                │
└───────────────────────────────────────┼────────────────────────────────┘
                                        ▼
┌───────────────────────────────────────────────────────────────────────┐
│ SERVEUR EXPRESS (Node.js, aucune dépendance ajoutée)                  │
│                                                                       │
│   server.js                                                            │
│   ├─ /api/jarvis/agents      → registre public des agents             │
│   ├─ /api/jarvis/health      → ping du moteur                         │
│   └─ /api/jarvis/command     → dispatch(input) → AgentOutput          │
│                │                                                      │
│                ▼                                                      │
│   jarvis/delegator.js                                                 │
│   ├─ parseIntent(input)            (regex/keyword, 6 routes)          │
│   ├─ runFilePicker(query)          (walk fs, scoring)                  │
│   ├─ runCodeSearcher(query)        (execFile grep récursif)            │
│   ├─ runBasher(command)            (execFile allowlist lecture)        │
│   ├─ runResearcher(prompt)         (stub plan structuré)              │
│   ├─ runOrchestrator(prompt)       (découpe en étapes file/code)       │
│   └─ delegateToChasseur(prompt)    (spawn ../chasseur-onirique)        │
└───────────────────────────────────────┬────────────────────────────────┘
                                        ▼ (sub-process optionnel)
┌───────────────────────────────────────────────────────────────────────┐
│ PROJET SIBLING : ../chasseur-onirique (TypeScript)                     │
│                                                                       │
│   src/index.ts  --task <prompt>                                        │
│   └─ HeuristicPlanner → Orchestrator → 8 agents spécialisés            │
│                                                                       │
│   Contrat renvoyé : { agent, data, notes, references,                  │
│                       confidence, log }   (cf. AgentOutput)            │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. Contrat `AgentOutput`

Le contrat est strictement compatible avec celui exposé par
`chasseur-onirique/src/agents/base.ts` :

```jsonc
{
  "ok": true,                 // succès de l'agent
  "agent": "file_picker",     // nom de l'agent exécuté
  "data": { ... },            // payload métier (matches / occurrences / stdout / plan)
  "notes": ["..."],           // 1..N messages humains (markdown lite autorisé)
  "references": ["..."],      // chemins / numéros de ligne / urls
  "confidence": 0.85,         // 0..1 — qualité perçue par l'agent
  "log": ["..."],             // trace interne (max 60 entrées)
  "dispatched_at": "ISO",     // horodatage dispatch
  "mode": "in-process" | "sub-process" | "sub-process-unparsed" | "fallback",
  "intent": {                 // diagnostic de routage
    "matched": true,
    "agent": "file_picker",
    "payload": "server.js",
    "confidence": 0.85
  },
  "received_at": "ISO",
  "finished_at": "ISO",
  "source": "voice" | "console" | "button" | "api"
}
```

Tous les agents — qu'ils soient in-process JS ou délégués à
chasseur-onirique — produisent **le même contrat**. Concrètement, le client
n'a jamais à savoir qui a exécuté la requête.

---

## 4. Grammaire d'intentions (intent parser)

Le parseur est **100 % regex/keyword**. Pas de LLM ici — la qualité est
assurée par des routes explicites et un orchestrateur de repli.

| Priorité | Mot-clé / pattern (entrée utilisateur)         | Agent cible    | Payload            |
| -------- | ------------------------------------------------ | -------------- | ------------------ |
| 1        | `délègue : …` / `plan chasseur …` / `orchestrateur …` | `delegator`    | texte après `:` / mot-clé |
| 2        | `recherche …` / `explique …` / `comment …` / `documentation …` | `researcher`  | reste de la phrase |
| 3        | `lance …` / `exécute …` / `shell : …` / `bash : …` / `commande : …` | `basher`       | commande brute     |
| 4        | `cherche le pattern …` / `grep …` / `où est utilisé …` | `code_searcher` | pattern textuel  |
| 5        | `trouve le fichier …` / `où est le fichier …` / `fichier : …` | `file_picker`  | nom / sous-chaîne  |
| 6        | _fallback_                                       | `orchestrator` | prompt entier      |

**Règles de scoring de confiance :**

* Confidence de routage : `0.85` (verb explicite) à `0.9` (delegator).
* Confidence d'agent : `min(0.95, 0.4 + N · 0.03)` (file_picker),
  `min(0.95, 0.5 + N · 0.02)` (code_searcher), `0.95` (basher OK),
  `0.35` (researcher dégradé), `0.5` (orchestrator générique).

---

## 5. Catalogue des agents

| Agent              | Mode          | Entrée → Sortie | Garanties | Limites |
| ------------------ | ------------- | --------------- | --------- | ------- |
| `file_picker`      | in-process JS | query → `matches[]` | scoring 0..4, top 25 résultats | pas d'indexation full-text, scoring lexical |
| `code_searcher`    | in-process JS | pattern → `occurrences[]` | `grep -rn` GNU, refs `path:line` | pas de regex structurée (PCRE), binaire exclu |
| `basher`           | in-process JS | command → `{stdout,stderr}` | allowlist stricte 19 commandes | pas de mutations (lecture seule) |
| `researcher`       | in-process JS | prompt → `plan[]` | planheur structuré en 4 étapes | n'appelle pas encore le web (stub) |
| `orchestrator`     | in-process JS | prompt → `steps[]` | au moins 2 étapes | pas d'exécution auto côté serveur |
| `delegator`        | sub-process   | prompt → `AgentOutput\chasseur` | timeout 12 s, JSON-extraction safe | nécessite tsx + accès au sibling |

### Arbre de décision

```text
input ──► parseIntent ─┬─ match verb ──► agentName ──► runXxx()
                       └─ aucun match ──► orchestrator ──► runOrchestrator()
```

---

## 6. Bus client↔serveur

### Routes Express

| Méthode | Route                 | Body / Query                                      | Réponse                                  |
| ------- | --------------------- | -------------------------------------------------- | ---------------------------------------- |
| `GET`   | `/api/jarvis/agents`  | —                                                  | `{ agents, allowlist, delegator_target }` |
| `GET`   | `/api/jarvis/health`  | —                                                  | `{ ok, agents_registered, … }`           |
| `POST`  | `/api/jarvis/command` | `{ command: string, source?: 'voice'\|'console'\|… }` | AgentOutput complet                       |

### Limites côté serveur

* Taille payload : `1200` caractères (413 si dépassement).
* Timeout sub-process : `12 000 ms` (SIGTERM propre).
* Buffer stdout sub-process : `2 Mo`.
* Basher timeout : `8 s` par commande.
* Buffer grep : `2 Mo`.
* Max d'entrées scannées : `4000` (file_picker).
* Max d'occurrences : `25` (code_searcher).

---

## 7. Console HUD côté page

### DOM

```html
<section id="jarvis-console-section">
    <div id="jarvis-console">
        <header> <!-- titre + statut --> </header>
        <div id="jarvis-logs" class="…h-64 overflow-y-auto custom-scrollbar…">
            <!-- les AgentOutput sont rendus ici par jarvis-console.js -->
        </div>
        <input id="jarvis-input" type="text" …/>
        <button id="btn-jarvis-send">Envoyer</button>
        <footer> ↑↓ historique · ENTRÉE · ÉCHAP · core : Nour_Gravity v1.0 + JARVIS engine </footer>
    </div>
</section>
```

### Raccourcis

| Touche       | Effet                                                    |
| ------------ | -------------------------------------------------------- |
| **Entrée**   | envoie la commande (`source='input'`)                    |
| **↑ / ↓**    | navigue dans l'historique (12 dernières max)             |
| **Échap**    | vide l'input s'il est focus                              |
| **Espace**   | démarre / arrête l'écoute micro (`continuous` mode)      |

### Wiring neural.js → agent output

Chaque AgentOutput reçu appelle :

```js
window.neuralBurstFromElement(row, 0.4 + confidence * 0.8);
```

→ une **onde d'activation** part du centre de la ligne de log dans le champ
neuronal 5D, intensité proportionnelle à la confiance. Plus la réponse est
fiable, plus l'arrière-plan pulse fortement.

### Synthèse vocale

Si l'assistant vocal est branché (`window.__jarvisVA`), un message court est
prononcé à chaque réponse :

* succès : `« Agent {name}, niveau de confiance {pct} pour cent. »`
* échec : `« Alerte : agent {name} en erreur. »`
* delegator sub-process : `« Plan chasseur exécuté via sous-process, … »`

---

## 8. Wire-up avec le projet sibling `chasseur-onirique`

### Conditions d'invocation

Le sous-process n'est lancé **que si** :

1. `../chasseur-onirique/node_modules/.bin/tsx` existe.
2. `../chasseur-onirique/src/index.ts` existe.
3. l'utilisateur a explicitement déclaré `délègue : …` ou `plan chasseur …`.

Sinon, fallback transparent vers le mode `in-process` avec un `note` honnête
dans l'AgentOutput.

### Format d'invocation

```bash
<tsx-path> <cli-path> --task "<prompt>" --quiet
```

* cwd = `../chasseur-onirique`
* `FORCE_COLOR=0` pour ne pas polluer stdout avec des séquences ANSI
* timeout 12 s, SIGTERM propre
* stdout parsé par `extractJson()` (cherche le 1er bloc `{...}` complet)

### Diagnostic

En cas de JSON absent / sale, l'AgentOutput expose :

```jsonc
{
  "ok": false,
  "agent": "delegator",
  "mode": "sub-process-unparsed",
  "data": { "stdout_tail": "...", "stderr_tail": "..." },
  "notes": ["sub-process terminé (code N) mais pas de JSON détecté", …],
  "confidence": 0.2,
  "references": ["…/chasseur-onirique/src/index.ts"]
}
```

La page affiche la sortie brute dans un bloc `<pre>` pour faciliter le debug.

---

## 9. Exemples d'invocations

| Commande tapée/prononcée                                       | Agent         | Sortie                                                        |
| -------------------------------------------------------------- | ------------- | ------------------------------------------------------------- |
| `trouve le fichier jarvis`                                     | file_picker   | liste des chemins contenant `jarvis` (scoring décroissant)     |
| `cherche le pattern NourNeural`                                | code_searcher | occurrences `path:line:contenu` relatives au champ neuronal   |
| `lance ls -la src`                                             | basher        | stdout du `ls`, projet hiérarchique                           |
| `lance ls -la /tmp`                                            | basher        | stdout du `ls` au-dessus du projet                            |
| `rm -rf /`                                                     | basher        | refusé (allowlist) — message clair                            |
| `recherche comment fonctionne Web Speech API`                  | researcher    | plan structuré en 4 étapes (stub)                             |
| `où est défini le mic`                                         | orchestrator  | plan : file_picker → code_searcher                            |
| `délègue : plan pour trouver le boot overlay`                 | delegator     | résultats de chasseur-onirique (sub-process)                 |
| `délègue : …` (sibling absent)                                | delegator     | fallback : plan heuristique exécuté en JS                     |

---

## 10. Limites connues (À NE PAS PROMETTRE)

Cette transformation **ne fait pas** :

| Non couvert                                              | Raison                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Contrôle **souris / clavier**                            | Pas de `xdotool` / `pynput` / `pyautogui` installés, headless    |
| **Vision écran** (screenshot OCR)                       | Pas de `tesseract`, pas d'environnement X11 (`$DISPLAY` vide)     |
| **Drag & drop**, clic droit, coordonnées arbitraires    | Hors-scope browser-only                                            |
| **Recherche web** réelle (`researcher`)                  | Stub en attendant un connecteur LLM (Anthropic / Google / local) |
| Désactiver / activer la matrice d'invocations existante | Volontairement séparé — coexistence                            |
| Persistance des commandes (historique session seulement) | Reload = reset, par design                                        |

Le basher **ne peut pas** muter le système : il est limité à une **allowlist
de 19 commandes en lecture seule** (`ls, cat, head, tail, pwd, wc, find,
stat, file, df, du, whoami, date, echo, tree, which, env, printenv`).

---

## 11. Risques / mitigations

| Risque                                               | Mitigation                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| JSON mal formé en provenance du sub-process          | `extractJson()` cherche le **1er** bloc JSON fermant correctement   |
| Sub-process zombie (timeout)                         | `SIGTERM` à T+12 s + buffer `2 Mo`                                |
| Grep sur fichiers binaires                           | `--binary-files=without-match` + excludes `.git`, `node_modules`    |
| file_picker consomme beaucoup d'I/O                  | `walk()` plafonné à `maxEntries=4000`, `maxDepth=6`, dossiers `.git`/`node_modules` ignorés |
| Commandes dangereuses (rm, mkfs, …)                  | BASHER_ALLOWLIST stricte (19 commandes) + log différencié         |
| Injection voice → commande shell                     | Pas directement : la voix passe par le même pipeline texte       |
| Conflit `name="user"` au clic micro                 | Le bouton micro ne prend **pas** le focus de l'input              |

---

## 12. Comment débugger en local

```bash
# 1. Lever le serveur
cd /home/el-hadj-ousmane/Bureau/Nour_Gravity
node server.js          # http://localhost:8080

# 2. Lister les agents disponibles
curl -s http://localhost:8080/api/jarvis/agents | python3 -m json.tool

# 3. Pinger le moteur
curl -s http://localhost:8080/api/jarvis/health | python3 -m json.tool

# 4. Tester un file_picker
curl -s -X POST http://localhost:8080/api/jarvis/command \
     -H "Content-Type: application/json" \
     -d '{"command":"trouve le fichier jarvis","source":"curl"}' | python3 -m json.tool

# 5. Tester un basher (lecture seule)
curl -s -X POST http://localhost:8080/api/jarvis/command \
     -H "Content-Type: application/json" \
     -d '{"command":"lance ls -la src"}' | python3 -m json.tool

# 6. Tester un delegator (sub-process)
curl -s -X POST http://localhost:8080/api/jarvis/command \
     -H "Content-Type: application/json" \
     -d '{"command":"délègue : trouve boot overlay"}' | python3 -m json.tool
```

Côté page :

* `F12` > Console : voir `console.log('[DEBUG] neuralField:', neuralField)`.
* `window.jarvisConsole.listAgents()` → liste des agents côté client.
* `window.jarvisConsole.health()` → ping.
* `window.__jarvisVA.speak("Bonjour")` → test rapide de la synthèse vocale.

---

## 13. Fichiers ajoutés / modifiés

| Fichier                          | État       | Rôle                                                       |
| -------------------------------- | ---------- | ---------------------------------------------------------- |
| `jarvis/delegator.js`            | **ajouté** | moteur (intent parser + 5 agents in-process + delegator)  |
| `docs/JARVIS_RAPPORT.md`         | **ajouté** | ce document                                                |
| `server.js`                      | modifié    | + import jarvis, + 3 routes, log de démarrage enrichi      |
| `src/index.html`                 | modifié    | + section `#jarvis-console-section` + script `jarvis-console.js` |
| `src/js/jarvis-console.js`       | **ajouté** | console HUD (rendu AgentOutput, history, voice ack)        |
| `src/js/main.js`                 | modifié    | init `jarvisConsole` + voice → `jarvisConsole.submit`       |

**Total** : ~620 lignes ajoutées, structure volontairement plate (zéro
build step préservé comme promis dans le README).

---

## 14. Ce qui reste à faire (suggestions)

* [ ] Brancher **vraiment** le `researcher` sur une recherche web (Anthropic / Google CSE / duckduckgo).
* [x] Persister l'historique dans `localStorage` pour reload-survive (clé `nour_jarvis_history`, 12 entrées max).
* [x] Ajouter un mode **`chain`** côté client : bouton « ▶ exécuter » sur chaque étape de plan → renvoie automatiquement la commande canonique à l'agent ciblé.
* [ ] Permettre à l'utilisateur d'**étendre l'allowlist** `BASHER_ALLOWLIST`
      via un fichier de configuration (sécurisé par lecture seule + revue).
* [ ] Brancher une **commande "ouvre le fichier X"** qui ouvre
      `xdg-open` / `open` (lecture OS-safe, en dehors des restrictions du
      basher parce que mutatif mais confiné à un type d'action).
* [ ] Permettre à JARVIS de controler la **matrice d'invocation** via
      `POST /api/jarvis/invoke <nom>` pour générer une ligne sans cliquer.

## 15. Suivi des incréments (v1.x)

### v1.1 — persistance + chain (light)
* `localStorage` (clé `nour_jarvis_history`, 12 entrées max, dédupé consécutif).
* Bouton « ▶ exécuter » sur chaque étape d'un plan de l'orchestrator →
  reconstruit la commande canonique (`trouve le fichier X`, `cherche le pattern X`, `lance X`, `recherche X`, `délègue : X`).
* `window.jarvisConsole.clearHistory()` efface et notifie la console.

### v1.1 — smoke test
* `scripts/smoke-jarvis.sh` — boote le serveur sur :4321, exerce 10 cas :
  health, agents, file_picker, basher OK (ls -la), basher refused (rm),
  code_searcher, orchestrator fallback, delegator, input vide (HTTP 400).
  Aucun build JS requis : `bash + curl + python3 -c`, ~80 lignes.

---

## 15. TL;DR

> Nour_Gravity **ne perd rien** — il gagne un **second cerveau**
> au-dessus du champ neuronal. Tout part d'une instruction (voix ou texte),
> passe par 6 routes d'intent, atterrit dans un agent (in-process ou
> chasseur-onirique), et revient sous la forme d'un **AgentOutput** rendu
> en HUD cyan avec un burst neuronal proportionnel à la confiance.

> **Le navigateur n'est plus l'interface — il devient le cockpit d'un
> orchestrateur qui, lui, parle au shell du PC.**
