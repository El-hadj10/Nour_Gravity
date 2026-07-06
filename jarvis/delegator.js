/**
 * NOUR_GRAVITY — J.A.R.V.I.S Engine (server-side)
 *
 * Module de délégation : parse une instruction (texte/voix) → choisit un agent →
 * exécute l'agent et renvoie un AgentOutput { agent, data, notes, references,
 * confidence, log } conforme au contrat de chasseur-onirique.
 *
 * Deux familles d'agents :
 *   - IN-PROCESS : stubs JS exécutés directement (file_picker, code_searcher,
 *                  basher, researcher). Pas de subprocess, réponse rapide.
 *   - SUB-PROCESS : wrapper spawn() qui délègue à l'orchestrateur TS du projet
 *                   sibling ../chasseur-onirique (tsx src/index.ts --task ...).
 *
 * Sécurité : exécution shell restreinte (allowlist) pour le basher.
 *
 * Aucune dépendance externe — uniquement fs / path / child_process / url
 * (toutes des modules natifs Node).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { URL } = require('url');

// --- CONFIGURATION ---------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHASSEUR_ROOT = path.resolve(PROJECT_ROOT, '..', 'chasseur-onirique');
const CHASSEUR_CLI = path.join(CHASSEUR_ROOT, 'src', 'index.ts');
const CHASSEUR_TSX = path.join(CHASSEUR_ROOT, 'node_modules', '.bin', 'tsx');
const MAX_RESULTS = 25;
const MAX_LOG_ENTRIES = 60;

// Allowlist très stricte pour le basher : seulement des commandes "LIRE".
const BASHER_ALLOWLIST = new Set([
    'ls', 'cat', 'head', 'tail', 'pwd', 'wc', 'find',
    'stat', 'file', 'df', 'du', 'whoami', 'date', 'echo',
    'tree', 'which', 'env', 'printenv',
]);

const IGNORE_DIRS = new Set([
    '.git', 'node_modules', '.next', '.cache', '.npm',
    'dist', 'build', 'coverage', '.vite', '.idea', '.vscode',
]);

// --- HELPERS ---------------------------------------------------------------

function nowIso() { return new Date().toISOString(); }

function emptyLog() { return []; }

function trimLog(log) {
    if (!Array.isArray(log)) return [];
    if (log.length <= MAX_LOG_ENTRIES) return log;
    return log.slice(-MAX_LOG_ENTRIES);
}

function buildOutput({ agent, data = null, notes = [], references = [],
                       confidence = 0.5, log = emptyLog(), ok = true }) {
    return {
        ok,
        agent,
        data,
        notes: Array.isArray(notes) ? notes : [String(notes)],
        references: Array.isArray(references) ? references : [],
        confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
        log: trimLog(log),
        dispatched_at: nowIso(),
        mode: 'in-process',
    };
}

/** Marche récursive d'un dossier, avec exclusions et bornes. */
function walk(root, opts = {}) {
    const maxDepth = opts.maxDepth || 6;
    const maxEntries = opts.maxEntries || 4000;
    const out = [];
    const stack = [{ dir: root, depth: 0 }];
    while (stack.length) {
        const { dir, depth } = stack.pop();
        if (depth > maxDepth) continue;
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (_) { continue; }
        for (const e of entries) {
            if (IGNORE_DIRS.has(e.name)) continue;
            if (e.name.startsWith('.') && e.name !== '.env.example') continue;
            const full = path.join(dir, e.name);
            if (out.length >= maxEntries) return out;
            out.push({ full, name: e.name, isDir: e.isDirectory() });
            if (e.isDirectory()) stack.push({ dir: full, depth: depth + 1 });
        }
    }
    return out;
}

/** Extrait le premier objet JSON complet trouvé dans une chaîne. */
function extractJson(text) {
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (_) { return null; }
}

// --- AGENTS IN-PROCESS ----------------------------------------------------

/** file_picker : trouve des fichiers dont le nom correspond à la requête. */
function runFilePicker(query) {
    const log = ['[file_picker] démarrage', `requête: "${query}"`];
    if (!query || !query.trim()) {
        return buildOutput({
            agent: 'file_picker',
            notes: ['requête vide — pas de critère de recherche'],
            confidence: 0.1,
            log,
        });
    }
    const needle = query.toLowerCase().trim();
    const tokens = needle.split(/\s+/).filter(Boolean);
    const all = walk(PROJECT_ROOT);
    log.push(`[file_picker] ${all.length} entrées scannées`);

    const scored = [];
    for (const e of all) {
        const lower = e.name.toLowerCase();
        let score = 0;
        for (const t of tokens) {
            if (lower === t) score += 4;
            else if (lower.includes(t)) score += 2;
            // match par extension très utile
            else if (t.startsWith('.') && lower.endsWith(t)) score += 3;
        }
        if (score > 0) scored.push({ ...e, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, MAX_RESULTS);

    log.push(`[file_picker] ${top.length} fichiers retenus`);
    return buildOutput({
        agent: 'file_picker',
        data: { matches: top.map(t => ({ path: path.relative(PROJECT_ROOT, t.full), score: t.score, isDir: t.isDir })) },
        notes: top.length
            ? [`${top.length} fichier(s) retenu(s) sur ${all.length} scannés`]
            : ['aucun fichier ne correspond à la requête'],
        references: top.map(t => path.relative(PROJECT_ROOT, t.full)),
        confidence: top.length ? Math.min(0.95, 0.4 + top.length * 0.03) : 0.2,
        log,
    });
}

/** code_searcher : grep récursif dans le projet (sur texte, pas binaire). */
function runCodeSearcher(query) {
    const log = ['[code_searcher] démarrage', `requête: "${query}"`];
    if (!query || !query.trim()) {
        return buildOutput({
            agent: 'code_searcher',
            notes: ['requête vide — pas de pattern'],
            confidence: 0.1,
            log,
        });
    }
    return new Promise((resolve) => {
        // utilise grep --line-number --recursive en mode texte
        // (compatible GNU grep présent sur Ubuntu 24.04)
        const args = [
            '-rni',                 // -r récursif -n n° de ligne -i insensible à la casse
            '--binary-files=without-match',
            '--exclude-dir=.git',
            '--exclude-dir=node_modules',
            '--exclude-dir=dist',
            '--exclude-dir=build',
            '--exclude-dir=.next',
            '--exclude-dir=.cache',
            query,
            PROJECT_ROOT,
        ];
        log.push(`[code_searcher] exec grep ${args.slice(0, 3).join(' ')} …`);
        execFile('grep', args, { maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err && err.code === 1) {
                return resolve(buildOutput({
                    agent: 'code_searcher',
                    notes: ['aucune occurrence trouvée dans le projet'],
                    references: [],
                    confidence: 0.4,
                    log: log.concat('[code_searcher] zéro match'),
                }));
            }
            if (err) {
                log.push(`[code_searcher] erreur: ${err.message}`);
                return resolve(buildOutput({
                    agent: 'code_searcher',
                    ok: false,
                    notes: [`grep a échoué: ${err.message}`],
                    confidence: 0.0,
                    log,
                }));
            }
            const lines = stdout.split('\n').filter(Boolean).slice(0, MAX_RESULTS);
            const references = [];
            const snippets = [];
            for (const line of lines) {
                const m = line.match(/^(.+?):(\d+):(.*)$/);
                if (m) {
                    const [, file, ln, content] = m;
                    const rel = path.relative(PROJECT_ROOT, file);
                    references.push(`${rel}:${ln}`);
                    snippets.push({ file: rel, line: Number(ln), content: content.trim() });
                } else {
                    references.push(line);
                }
            }
            log.push(`[code_searcher] ${snippets.length} occurrence(s) retenue(s)`);
            resolve(buildOutput({
                agent: 'code_searcher',
                data: { occurrences: snippets },
                notes: [`${snippets.length} ligne(s) matchante(s)`],
                references,
                confidence: snippets.length ? Math.min(0.95, 0.5 + snippets.length * 0.02) : 0.3,
                log,
            }));
        });
    });
}

/** basher : exécute une commande shell en lecture seule (allowlist stricte). */
function runBasher(command) {
    const log = ['[basher] démarrage', `commande: "${command}"`];
    if (!command || !command.trim()) {
        return buildOutput({
            agent: 'basher',
            notes: ['commande vide'],
            confidence: 0.1,
            log,
        });
    }
    const trimmed = command.trim();
    const head = trimmed.split(/\s+/)[0];
    const exec = BASHER_ALLOWLIST.has(head) ? head : null;

    if (!exec) {
        log.push(`[basher] commande refusée (pas dans l'allowlist): ${head}`);
        return buildOutput({
            agent: 'basher',
            ok: false,
            notes: [
                `commande "${head}" refusée — allowlist lecture seule`,
                `commandes autorisées: ${[...BASHER_ALLOWLIST].sort().join(', ')}`,
            ],
            references: [],
            confidence: 0.0,
            log,
        });
    }
    log.push(`[basher] execFile ${trimmed}`);
    return new Promise((resolve) => {
        const parts = trimmed.split(/\s+/);
        execFile(exec, parts.slice(1), { cwd: PROJECT_ROOT, maxBuffer: 4 * 1024 * 1024, timeout: 8000 }, (err, stdout, stderr) => {
            if (err) {
                log.push(`[basher] erreur: ${err.message || err.code}`);
                if (err.code === 'ENOENT') {
                    return resolve(buildOutput({
                        agent: 'basher',
                        ok: false,
                        notes: [`commande absente sur l'hôte: ${exec}`],
                        log,
                        confidence: 0.0,
                    }));
                }
                if (stderr && !stdout) {
                    return resolve(buildOutput({
                        agent: 'basher',
                        data: { stderr: stderr.slice(0, 2000) },
                        notes: [`commande terminée avec stderr`],
                        log,
                        confidence: 0.3,
                    }));
                }
                return resolve(buildOutput({
                    agent: 'basher',
                    data: { stdout: (stdout || '').slice(0, 2000), stderr: (stderr || '').slice(0, 1000) },
                    notes: [`commande terminée en erreur (code ${err.code || '?'})`],
                    log,
                    confidence: 0.3,
                }));
            }
            log.push(`[basher] OK (${(stdout || '').length}o)`);
            resolve(buildOutput({
                agent: 'basher',
                data: {
                    command: trimmed,
                    stdout: (stdout || '').slice(0, 4000),
                    stderr: (stderr || '').slice(0, 1000),
                },
                notes: [`commande "${exec}" terminée avec succès`],
                log,
                confidence: 0.95,
            }));
        });
    });
}

/** researcher : stub pédagogique — affiche un "plan de recherche" en attendant
 *  une véritable intégration LLM côté client. Renvoie une AgentOutput honnête. */
function runResearcher(prompt) {
    const log = ['[researcher] démarrage', `prompt: "${prompt}"`];
    log.push('[researcher] intégration web en attente — plan simulé');
    const plan = [
        `1. Reformuler la question : "${prompt}"`,
        '2. Identifier les sources pertinentes (docs officielles, GitHub, MDN…)',
        '3. Cadrer 3 sous-questions et leurs angles d\'attaque',
        '4. Synthétiser la réponse en moins de 6 phrases',
    ];
    return buildOutput({
        agent: 'researcher',
        data: { plan, prompt },
        notes: [
            'agent en mode dégradé — pas d\'appel web/LLM actif',
            'utiliser ce plan pour préparer la requête manuellement',
        ],
        confidence: 0.35,
        log,
    });
}

/** orchestrator : tente d'inférer une chaîne d'agents sur un prompt vague. */
function runOrchestrator(prompt, registry) {
    const log = ['[orchestrator] plan heuristique', `prompt: "${prompt}"`];
    const steps = [];
    const lower = String(prompt || '').toLowerCase();

    if (/fichier|où|chemin|trouve/.test(lower)) {
        steps.push({ agent: 'file_picker', hint: extractTarget(lower) || 'fichier lié au prompt', confidence: 0.6 });
    }
    if (/cherche|pattern|grep|r[eé]f[eé]rence/.test(lower)) {
        steps.push({ agent: 'code_searcher', hint: extractTarget(lower) || 'mot-clé', confidence: 0.55 });
    }
    if (/lance|ex[eé]cute|commande|shell|bash/.test(lower)) {
        steps.push({ agent: 'basher', hint: extractTarget(lower) || 'ls -la', confidence: 0.5 });
    }
    if (/doc|comment|tutoriel|api|recherche|explique/.test(lower)) {
        steps.push({ agent: 'researcher', hint: prompt, confidence: 0.4 });
    }
    if (steps.length === 0) {
        steps.push({ agent: 'file_picker', hint: prompt, confidence: 0.3 });
        steps.push({ agent: 'code_searcher', hint: prompt, confidence: 0.3 });
    }
    log.push(`[orchestrator] ${steps.length} étape(s) planifiée(s)`);
    return buildOutput({
        agent: 'orchestrator',
        data: { steps, prompt },
        notes: [
            'plan heuristique — exécution séquentielle possible côté client',
            `agents disponibles: ${registry.map(r => r.name).join(', ')}`,
        ],
        confidence: 0.5,
        log,
    });
}

function extractTarget(haystack) {
    // cherche une portion entre guillemets / apostrophes ou après "le/la/les"
    const quoted = haystack.match(/["'«»]([^"'«»]+)["'«»]/);
    if (quoted) return quoted[1].trim();
    const after = haystack.match(/(?:le|la|les|du|des|fichier|pattern|commande)\s+([\w.\-\/]+)/);
    if (after) return after[1].trim();
    return null;
}

// --- AGENT REGISTRY -------------------------------------------------------

const AGENTS = [
    {
        name: 'file_picker',
        description: 'Cherche des fichiers dont le nom matche la requête dans le projet.',
        examples: ['trouve le fichier server.js', 'cherche le fichier style.css'],
    },
    {
        name: 'code_searcher',
        description: 'Recherche un pattern textuel dans le code source (grep récursif).',
        examples: ['cherche le pattern NourNeural', 'grep initBoot'],
    },
    {
        name: 'basher',
        description: 'Exécute une commande shell en lecture seule (allowlist stricte).',
        examples: ['lance ls -la src', 'execute pwd'],
    },
    {
        name: 'researcher',
        description: 'Plan de recherche web (stub pédagogique en attendant un LLM).',
        examples: ['recherche comment fonctionne Web Speech API'],
    },
    {
        name: 'orchestrator',
        description: 'Planificateur — découpe un prompt vague en étapes file_picker + code_searcher.',
        examples: ['où est défini le mic', 'plan pour trouver le boot overlay'],
    },
    {
        name: 'delegator',
        description: 'Délègue au projet sibling chasseur-onirique (TS multi-agent orchestrator).',
        examples: ['délègue au plan : trouve-moi le fichier neural'],
    },
];

// --- INTENT PARSER --------------------------------------------------------

/**
 * Reconnaît une instruction et retourne l'agent ciblé + le payload extrait.
 * 100 % regex/keyword — pas de LLM ici (à charger côté client si voulu).
 */
function parseIntent(input) {
    const text = String(input || '').trim();
    if (!text) return { agent: 'orchestrator', payload: '', matched: false, confidence: 0 };

    const norm = text.toLowerCase();

    // 1) Délégation explicite au projet sibling
    const delegMatch = norm.match(/^(?:d[eé]l[eè]gue|d[eé]l[eè]guation|plan\s+chasseur|chasseur|orchestrateur|orchestrator)\s*[:\-]?\s*(.+)$/);
    if (delegMatch) return { agent: 'delegator', payload: delegMatch[1].trim(), matched: true, confidence: 0.9 };

    // 2) Researcher (recherche / question large)
    const resMatch = norm.match(/^(?:recherche(?:r)?|doc(?:umentation)?|explique(?:-moi)?|qu'est-ce que|comment\s+fonctionne|comment\s+faire|how\s+to)\s+(.+)$/);
    if (resMatch) return { agent: 'researcher', payload: resMatch[1].trim(), matched: true, confidence: 0.7 };

    // 3) Basher (lance / exécute une commande)
    const bashMatch = norm.match(/^(?:lance(?:r)?|ex[eé]cute(?:r)?|shell\s*:|bash\s*:|commande\s*:)\s+(.+)$/);
    if (bashMatch) return { agent: 'basher', payload: bashMatch[1].trim(), matched: true, confidence: 0.85 };

    // 4) Code search (cherche un pattern / grep)
    const codeMatch = norm.match(/^(?:cherche(?:r)?\s+(?:le\s+)?pattern|grep(?:\s+le)?|recherche\s+(?:de\s+)?code|o[uù]\s+est\s+(?:utilis[eé]|d[eé]clar[eé]))\s*(.+)$/);
    if (codeMatch) {
        const payload = codeMatch[1].trim();
        return { agent: 'code_searcher', payload, matched: true, confidence: 0.8 };
    }

    // 5) File picker (trouve le fichier / où est X)
    const fileMatch = norm.match(/^(?:trouve(?:-moi)?\s+(?:le|la|les)?\s*fichier|cherche(?:-moi)?\s+(?:le|la|les)?\s*fichier|o[uù]\s+est\s+(?:le|la|les)?\s*fichier|fichier\s*:)\s*(.+)$/);
    if (fileMatch) {
        return { agent: 'file_picker', payload: fileMatch[1].trim(), matched: true, confidence: 0.85 };
    }

    // 6) Orchestrator fallback (prompt vague)
    return { agent: 'orchestrator', payload: text, matched: false, confidence: 0.3 };
}

// --- DELEGATE TO CHASSEUR-ONIRIQUE (sub-process) -------------------------

/**
 * Lance le CLI TS du projet sibling ../chasseur-onirique en sous-process.
 * Attend '--task <prompt>' et lit un JSON final sur stdout.
 */
function delegateToChasseur(prompt) {
    const log = ['[delegator] spawn ../chasseur-onirique', `task: "${prompt}"`];
    return new Promise((resolve) => {
        // Garde-fous : on n'invoque que si le binaire et le CLI existent.
        if (!fs.existsSync(CHASSEUR_TSX) || !fs.existsSync(CHASSEUR_CLI)) {
            log.push('[delegator] chasseur-onirique non exécutable localement (tsx ou src/index.ts manquant)');
            return resolve(buildOutput({
                agent: 'delegator',
                ok: false,
                data: { hint: 'fallback vers l\'orchestrator JS', steps: [
                    { agent: 'file_picker', hint: prompt },
                    { agent: 'code_searcher', hint: prompt },
                ] },
                notes: [
                    'sub-process TS indisponible sur cet hôte',
                    'fallback : plan heuristique côté Nour_Gravity',
                ],
                confidence: 0.25,
                references: [CHASSEUR_CLI],
                log,
                mode: 'fallback',
            }));
        }

        log.push(`[delegator] exec: ${CHASSEUR_TSX} ${CHASSEUR_CLI} --task …`);
        const child = spawn(CHASSEUR_TSX, [CHASSEUR_CLI, '--task', prompt, '--quiet'], {
            cwd: CHASSEUR_ROOT,
            env: { ...process.env, FORCE_COLOR: '0' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let killed = false;

        const timeout = setTimeout(() => {
            killed = true;
            log.push('[delegator] timeout (12s) — kill du sous-process');
            child.kill('SIGTERM');
        }, 12_000);

        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });
        child.on('close', (code) => {
            clearTimeout(timeout);
            if (killed) {
                return resolve(buildOutput({
                    agent: 'delegator',
                    ok: false,
                    notes: ['sous-process tué après 12s'],
                    log,
                    confidence: 0.0,
                }));
            }
            log.push(`[delegator] code de sortie: ${code}`);
            const json = extractJson(stdout);
            if (json && typeof json === 'object') {
                return resolve({
                    ...buildOutput({
                        agent: 'delegator',
                        data: json,
                        notes: [`plan exécuté par chasseur-onirique (exit ${code})`],
                        references: [CHASSEUR_CLI],
                        confidence: 0.9,
                        log,
                        ok: true,
                    }),
                    mode: 'sub-process',
                    raw_stdout_tail: stdout.slice(-500),
                });
            }
            // Pas de JSON propre : on signale honnêtement, mais on laisse
            // `ok=true` si le sous-process a réussi (exit 0) — l'utilisateur
            // a quand même reçu du stdout, c'est utile même non-structuré.
            const ranCleanly = code === 0 && stdout.length > 0;
            return resolve(buildOutput({
                agent: 'delegator',
                ok: ranCleanly,
                data: { stdout_tail: stdout.slice(-1500), stderr_tail: stderr.slice(-500) },
                notes: ranCleanly
                    ? [`sub-process terminé (code ${code}) — pas de JSON, stdout brut ci-dessous`]
                    : [`sub-process terminé (code ${code}) mais pas de JSON détecté`, 'consulter la sortie brute'],
                references: [CHASSEUR_CLI],
                log,
                confidence: ranCleanly ? 0.55 : 0.15,
                mode: ranCleanly ? 'sub-process-unparsed' : 'sub-process-error',
            }));
        });
        child.on('error', (err) => {
            clearTimeout(timeout);
            log.push(`[delegator] spawn error: ${err.message}`);
            resolve(buildOutput({
                agent: 'delegator',
                ok: false,
                notes: [`impossible de lancer le sous-process: ${err.message}`],
                log,
                confidence: 0.0,
            }));
        });
    });
}

// --- DISPATCHER PUBLIC ----------------------------------------------------

/**
 * Point d'entrée principal : reçoit une instruction brute et renvoie
 * un AgentOutput (avec dispatch vers l'agent approprié).
 */
async function dispatch(input, opts = {}) {
    const intent = parseIntent(input);
    const startedAt = nowIso();
    let result;

    switch (intent.agent) {
        case 'file_picker':
            result = runFilePicker(intent.payload); break;
        case 'code_searcher':
            result = await runCodeSearcher(intent.payload); break;
        case 'basher':
            result = await runBasher(intent.payload); break;
        case 'researcher':
            result = runResearcher(intent.payload); break;
        case 'orchestrator':
            result = runOrchestrator(intent.payload, AGENTS); break;
        case 'delegator':
            result = await delegateToChasseur(intent.payload); break;
        default:
            result = buildOutput({
                agent: 'orchestrator',
                notes: [`intent "${intent.agent}" non résolu`],
                confidence: 0.0,
            });
    }

    return {
        ...result,
        intent: {
            matched: intent.matched,
            confidence: intent.confidence,
            agent: intent.agent,
            payload: intent.payload,
        },
        received_at: startedAt,
        finished_at: nowIso(),
        source: opts.source || 'unknown',
    };
}

function listAgents() {
    return AGENTS.map(a => ({ ...a }));
}

module.exports = {
    dispatch,
    parseIntent,
    listAgents,
    AGENTS,
    BASHER_ALLOWLIST,
    PROJECT_ROOT,
    CHASSEUR_ROOT,
};
