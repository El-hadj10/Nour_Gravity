/**
 * NOUR_GRAVITY — JARVIS Console (client-side)
 *
 * Une petite console HUD qui envoie des instructions au moteur de délégation
 * (POST /api/jarvis/command), affiche l'AgentOutput retourné et déclenche
 * un burst neuronal proportionnel au score de confiance.
 *
 * Dépend de :
 *   - window.NourNeural.mount('neural-canvas')      pour burst()
 *   - window.neuralBurstFromElement(el, energy)    fourni par main.js
 *   - window.VoiceAssistant                        pour la synthèse vocale
 *
 * Pas de dépendance externe.
 */
(function () {
    'use strict';

    const ENDPOINT_COMMAND = '/api/jarvis/command';
    const ENDPOINT_AGENTS = '/api/jarvis/agents';
    const ENDPOINT_HEALTH = '/api/jarvis/health';
    const HISTORY_LIMIT = 12;
    const SYMBOL_BY_AGENT = {
        file_picker: '📁',
        code_searcher: '🔍',
        basher: '🛠',
        researcher: '🌐',
        orchestrator: '🧭',
        delegator: '🛰',
    };

    const state = {
        history: [],
        historyCursor: -1,
        busy: false,
        lastResult: null,
    };

    const HISTORY_KEY = 'nour_jarvis_history';
    function loadHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
        } catch (_) { return []; }
    }
    function saveHistory(history) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)));
        } catch (_) {}
    }
    function clearHistory() {
        try { localStorage.removeItem(HISTORY_KEY); } catch (_) {}
        state.history = [];
        state.historyCursor = -1;
    }

    function $(id) { return document.getElementById(id); }

    function timestamp() {
        const d = new Date();
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function symbolFor(agentName) {
        return SYMBOL_BY_AGENT[agentName] || '✦';
    }

    /** Crée un élément DOM avec classes Tailwind minimales. */
    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text != null) e.textContent = text;
        return e;
    }

    /** Markdown-lite sécurisé : gère les blocs ```code``` et **bold**.*/
    function renderInline(parent, text) {
        const codeBlocks = String(text || '').split(/```/);
        for (let i = 0; i < codeBlocks.length; i++) {
            const isCode = i % 2 === 1;
            if (isCode) {
                const pre = document.createElement('pre');
                pre.className = 'whitespace-pre-wrap text-[10px] leading-relaxed font-mono ' +
                    'bg-black/40 border border-white/5 rounded p-2 my-2 text-cyan-200';
                pre.textContent = codeBlocks[i];
                parent.appendChild(pre);
            } else {
                // bold **xxx**
                const parts = codeBlocks[i].split(/(\*\*[^*]+\*\*)/g);
                for (const p of parts) {
                    if (!p) continue;
                    if (p.startsWith('**') && p.endsWith('**')) {
                        const b = document.createElement('strong');
                        b.className = 'text-amber-300 font-semibold';
                        b.textContent = p.slice(2, -2);
                        parent.appendChild(b);
                    } else {
                        parent.appendChild(document.createTextNode(p));
                    }
                }
            }
        }
    }

    /** Affiche la bannière d'entrée quand la console apparaît. */
    function renderWelcome(logsEl) {
        const welcome = el('div', 'text-[10px] font-mono text-cyan-300/70 leading-relaxed');
        welcome.innerHTML = [
            '✦ J.A.R.V.I.S Core en ligne — bus de délégation armé.',
            '',
            'Intentions reconnues (mots-clés en français / anglais) :',
            '  · <span class="text-amber-300">trouve le fichier X</span>  → file_picker',
            '  · <span class="text-amber-300">cherche le pattern X</span> → code_searcher',
            '  · <span class="text-amber-300">lance ls -la</span>       → basher (allowlist)',
            '  · <span class="text-amber-300">recherche X</span>        → researcher (stub)',
            '  · <span class="text-amber-300">délègue : X</span>         → delegator (chasseur-onirique)',
            '  · <span class="text-amber-400">assistant vocal</span>     → parler + bouton micro flottant',
            '',
            'Saisis une commande puis valide, ou appuie sur ENTRÉE.',
        ].join('\n');
        logsEl.appendChild(welcome);
    }

    /** Affiche un message utilisateur dans la console. */
    function renderUserMessage(logsEl, text) {
        const row = el('div', 'py-2 border-b border-white/5');
        const meta = el('div', 'text-[10px] font-mono text-white/40 tracking-wider mb-1');
        meta.textContent = `▶ ${timestamp()} · VOUS`;
        const body = el('div', 'text-sm text-white/90');
        body.textContent = text;
        row.appendChild(meta);
        row.appendChild(body);
        logsEl.appendChild(row);
    }

    /** Affiche un AgentOutput stylisé. */
    function renderAgentOutput(logsEl, output) {
        const row = el('div', 'py-3 border-b border-cyan-400/10 fresh-row');
        const symbol = symbolFor(output.agent);
        const confidencePct = Math.round((output.confidence || 0) * 100);
        const mode = output.mode || 'in-process';

        const head = el('div', 'flex items-baseline gap-2 text-[10px] font-mono tracking-wider mb-2');
        head.appendChild(el('span', 'text-amber-300 text-sm', symbol));
        head.appendChild(el('span', 'text-amber-300 uppercase', output.agent || 'agent'));
        head.appendChild(el('span', 'text-white/40', '·'));
        head.appendChild(el('span', 'text-cyan-300', `${confidencePct}%`));
        head.appendChild(el('span', 'text-white/40', '·'));
        head.appendChild(el('span', 'text-white/30', `${timestamp()} · ${mode}`));
        if (output.intent) {
            head.appendChild(el('span', 'text-white/30', `· intent=${output.intent.agent}`));
        }
        row.appendChild(head);

        // Statut global
        if (output.ok === false) {
            row.appendChild(el('div', 'text-[11px] text-rose-300 mt-1', '⚠ statut : échec'));
        } else {
            row.appendChild(el('div', 'text-[11px] text-emerald-300/80 mt-1', '✓ statut : OK'));
        }

        // Notes (markdown lite sûr)
        if (output.notes && output.notes.length) {
            const notesBlock = el('div', 'mt-2 text-xs text-white/80');
            renderInline(notesBlock, output.notes.map(n => `· ${n}`).join('\n'));
            row.appendChild(notesBlock);
        }

        // Data rendering (selon l'agent)
        if (output.data) {
            const dataBlock = el('div', 'mt-2 text-xs text-white/70');
            renderDataForAgent(dataBlock, output);
            row.appendChild(dataBlock);
        }

        // References
        if (output.references && output.references.length) {
            const refsBlock = el('div', 'mt-2');
            const refsLabel = el('div', 'text-[10px] font-mono text-white/40 uppercase tracking-widest', 'References');
            const refsList = el('div', 'text-[10px] font-mono text-cyan-300/80 break-all');
            refsList.textContent = output.references.slice(0, 8).join(' ∙ ');
            if (output.references.length > 8) refsList.textContent += ` … (+${output.references.length - 8})`;
            refsBlock.appendChild(refsLabel);
            refsBlock.appendChild(refsList);
            row.appendChild(refsBlock);
        }

        // Log strip
        const logToggle = el('details', 'mt-2 text-[10px] font-mono text-white/40');
        const logSummary = document.createElement('summary');
        logSummary.className = 'cursor-pointer hover:text-white/70';
        logSummary.textContent = `▸ log interne (${(output.log || []).length} ligne${(output.log || []).length > 1 ? 's' : ''})`;
        logToggle.appendChild(logSummary);
        const logPre = el('pre', 'whitespace-pre-wrap leading-relaxed mt-1 text-cyan-200/50');
        logPre.textContent = (output.log || []).join('\n');
        logToggle.appendChild(logPre);
        row.appendChild(logToggle);

        logsEl.appendChild(row);
        return row;
    }

    /** Rendu spécial pour les `data` des agents connus. */
    function renderDataForAgent(container, output) {
        const data = output.data;
        if (!data) return;
        switch (output.agent) {
            case 'file_picker': {
                if (Array.isArray(data.matches)) {
                    if (data.matches.length === 0) {
                        container.appendChild(el('div', 'italic text-white/40', '(aucun fichier trouvé)'));
                        return;
                    }
                    const ul = el('ul', 'space-y-1');
                    for (const m of data.matches.slice(0, 12)) {
                        const li = el('li', 'flex justify-between gap-3 font-mono text-[11px]');
                        const pathEl = el('span', 'text-cyan-300 break-all', m.path + (m.isDir ? '/' : ''));
                        const scoreEl = el('span', 'text-amber-300 whitespace-nowrap', `score ${m.score}`);
                        li.appendChild(pathEl);
                        li.appendChild(scoreEl);
                        ul.appendChild(li);
                    }
                    container.appendChild(ul);
                    if (data.matches.length > 12) {
                        container.appendChild(el('div', 'text-[10px] text-white/40 mt-1',
                            `… +${data.matches.length - 12} résultat(s)`));
                    }
                }
                return;
            }
            case 'code_searcher': {
                if (Array.isArray(data.occurrences)) {
                    const ul = el('ul', 'space-y-1');
                    for (const occ of data.occurrences.slice(0, 10)) {
                        const li = el('li', 'font-mono text-[11px] text-cyan-200');
                        li.innerHTML = `<span class="text-white/40">${escapeHtml(occ.file)}:${occ.line}</span> <span class="text-white/70">${escapeHtml(occ.content)}</span>`;
                        ul.appendChild(li);
                    }
                    container.appendChild(ul);
                    if (data.occurrences.length > 10) {
                        container.appendChild(el('div', 'text-[10px] text-white/40 mt-1',
                            `… +${data.occurrences.length - 10} occurrence(s)`));
                    }
                }
                return;
            }
            case 'basher': {
                if (data.stdout) {
                    const pre = el('pre',
                        'whitespace-pre-wrap leading-snug font-mono text-[11px] ' +
                        'bg-black/40 border border-white/5 rounded p-2 max-h-48 overflow-auto custom-scrollbar',
                        data.stdout);
                    container.appendChild(pre);
                }
                if (data.stderr) {
                    container.appendChild(el('div', 'text-[10px] text-rose-300/80 mt-1', `[stderr] ${data.stderr}`));
                }
                return;
            }
            case 'researcher': {
                if (Array.isArray(data.plan)) {
                    container.appendChild(el('div', 'text-white/60 italic mb-1', `prompt : ${data.prompt}`));
                    const ol = el('ol', 'list-decimal list-inside text-white/80 space-y-1');
                    for (const step of data.plan) {
                        const li = document.createElement('li');
                        li.textContent = step;
                        ol.appendChild(li);
                    }
                    container.appendChild(ol);
                }
                return;
            }
            case 'orchestrator': {
                if (Array.isArray(data.steps)) {
                    const wrap = el('div', 'space-y-1');
                    for (const s of data.steps) {
                        const li = el('li',
                            'text-[11px] font-mono text-white/80 flex justify-between gap-3 items-center py-1 border-b border-white/[0.04]');
                        const left = el('div', 'flex-1 min-w-0');
                        const label = el('div', 'text-amber-300', `${symbolFor(s.agent)} ${s.agent}`);
                        const hint = el('div', 'text-cyan-200/80 break-all', s.hint || '');
                        left.appendChild(label);
                        left.appendChild(hint);

                        const right = el('div', 'flex items-center gap-2 whitespace-nowrap');
                        const conf = el('span', 'text-white/40',
                            `${Math.round((s.confidence || 0) * 100)}%`);
                        const execBtn = el('button',
                            'text-cyan-300 hover:text-cyan-100 border border-cyan-400/30 hover:border-cyan-400/60 px-2 py-[2px] rounded text-[10px] uppercase tracking-wider transition',
                            '▶ exécuter');
                        execBtn.title = `Enchaîner avec ${s.agent}`;
                        execBtn.addEventListener('click', (ev) => {
                            ev.preventDefault();
                            if (window.jarvisConsole && typeof window.jarvisConsole.submitRaw === 'function') {
                                const command = buildCommandForAgent(s.agent, s.hint || '');
                                window.jarvisConsole.submitRaw(command);
                            }
                        });
                        right.appendChild(conf);
                        right.appendChild(execBtn);

                        li.appendChild(left);
                        li.appendChild(right);
                        wrap.appendChild(li);
                    }
                    container.appendChild(wrap);
                }
                return;
            }
            case 'delegator': {
                if (data.hint) {
                    container.appendChild(el('div', 'italic text-white/60', `(mode dégradé) ${data.hint}`));
                }
                if (data.stdout_tail) {
                    container.appendChild(el('div', 'text-[10px] text-white/40 mt-1', 'stdout (extrait) :'));
                    const pre = el('pre',
                        'whitespace-pre-wrap leading-snug font-mono text-[10px] ' +
                        'bg-black/40 border border-white/5 rounded p-2 max-h-48 overflow-auto custom-scrollbar',
                        data.stdout_tail);
                    container.appendChild(pre);
                }
                return;
            }
            default: {
                const pre = el('pre',
                    'whitespace-pre-wrap font-mono text-[11px] ' +
                    'bg-black/30 border border-white/5 rounded p-2',
                    JSON.stringify(data, null, 2));
                container.appendChild(pre);
            }
        }
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    function setStatus(text, color) {
        const statusEl = $('jarvis-status');
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.style.color = color || 'inherit';
    }

    /** Soumet une commande au backend. */
    async function submit(input, opts = {}) {
        const inputEl = $('jarvis-input');
        const sendBtn = $('btn-jarvis-send');
        const logsEl = $('jarvis-logs');

        if (!input.trim()) return;
        if (state.busy) return;

        state.busy = true;
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = '…en cours';
        }
        setStatus('BUSY', '#fbbf24');
        try { if (window.NourNeural && window.neuralBurstFromElement) window.neuralBurstFromElement(sendBtn, 0.4); } catch (_) {}

        if (inputEl && inputEl.value !== input) inputEl.value = input;

        // Historique (dedupe des doublons consécutifs) + persistance localStorage
        if (state.history[state.history.length - 1] !== input) {
            state.history.push(input);
            if (state.history.length > HISTORY_LIMIT) state.history.shift();
        }
        state.historyCursor = -1;
        saveHistory(state.history);

        renderUserMessage(logsEl, input);

        try {
            const resp = await fetch(ENDPOINT_COMMAND, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: input, source: opts.source || 'console' }),
            });
            const json = await resp.json();
            state.lastResult = json;

            const row = renderAgentOutput(logsEl, json);

            // Burst neuronal proportionnel à la confiance
            try {
                const energy = 0.4 + (json.confidence || 0) * 0.8;
                if (window.neuralBurstFromElement && row) window.neuralBurstFromElement(row, energy);
                else if (window.NourNeural && row) {
                    const rect = row.getBoundingClientRect();
                    window.NourNeural.mount && (function () {
                        // essaie d'accéder au NeuralField global via window.__nourNeural si exposé
                        const nf = window.__nourNeural;
                        if (nf && typeof nf.burst === 'function') {
                            nf.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, energy);
                        }
                    })();
                }
            } catch (_) {}

            // Synthèse vocale discrète (pas sur la première bannière)
            if (window.VoiceAssistant && opts.voiceAcknowledge !== false) {
                try {
                    const va = window.__jarvisVA || window.jarvisVoiceAssistant;
                    const ack = buildVoiceAck(json);
                    if (va && typeof va.speak === 'function') va.speak(ack);
                } catch (_) {}
            }

            setStatus(json.ok === false ? 'ALERT' : 'ONLINE', json.ok === false ? '#f87171' : '#a5f3fc');
            // Auto-scroll
            logsEl.scrollTop = logsEl.scrollHeight;
        } catch (err) {
            const row = el('div', 'py-3 border-b border-rose-500/20 text-rose-300 text-xs font-mono',
                `✖ erreur réseau : ${err.message}`);
            logsEl.appendChild(row);
            setStatus('LINK LOST', '#f87171');
        } finally {
            state.busy = false;
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Envoyer';
            }
        }
    }

    /** Construit une commande en français canonique à partir d'un agent + hint. */
    function buildCommandForAgent(agent, hint) {
        const trimmed = String(hint || '').trim();
        switch (agent) {
            case 'file_picker':     return `trouve le fichier ${trimmed}`;
            case 'code_searcher':   return `cherche le pattern ${trimmed}`;
            case 'basher':          return `lance ${trimmed}`;
            case 'researcher':      return `recherche ${trimmed}`;
            case 'delegator':       return `délègue : ${trimmed}`;
            default:                return trimmed;
        }
    }

    function buildVoiceAck(output) {
        const a = output.agent || 'agent';
        const pct = Math.round((output.confidence || 0) * 100);
        if (output.ok === false) {
            return `Alerte : agent ${a} en erreur.`;
        }
        if (output.agent === 'delegator' && output.mode === 'sub-process') {
            return `Plan chasseur exécuté via sous-process, confiance ${pct} pour cent.`;
        }
        if (output.agent === 'basher') {
            return `Commande shell terminée, confiance ${pct} pour cent.`;
        }
        return `Agent ${a}, niveau de confiance ${pct} pour cent.`;
    }

    /** Initialise la console JARVIS à partir du DOM. */
    async function init() {
        const inputEl = $('jarvis-input');
        const sendBtn = $('btn-jarvis-send');
        const logsEl = $('jarvis-logs');
        if (!inputEl || !sendBtn || !logsEl) {
            console.warn('[JARVIS] Console absente du DOM — initialisation différée.');
            return;
        }

        // Recharge l'historique depuis localStorage (léger, ~12 entrées)
        state.history = loadHistory();

        renderWelcome(logsEl);
        if (state.history.length) {
            const sep = el('div', 'text-[10px] font-mono text-white/30 my-2', `— historique rechargé : ${state.history.length} entrée(s) —`);
            logsEl.appendChild(sep);
        }

        // Vérifie la santé au démarrage
        try {
            const resp = await fetch(ENDPOINT_AGENTS);
            const json = await resp.json();
            if (json.ok) {
                setStatus(`${json.agents.length} AGENTS READY`, '#a5f3fc');
            } else {
                setStatus('CORE OFFLINE', '#f87171');
            }
        } catch (_) {
            setStatus('NO LINK', '#f87171');
        }

        sendBtn.addEventListener('click', () => submit(inputEl.value, { source: 'button' }));

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(inputEl.value, { source: 'input' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (state.history.length === 0) return;
                state.historyCursor = Math.min(state.history.length - 1,
                    state.historyCursor < 0 ? state.history.length - 1 : state.historyCursor - 1 + 1);
                if (state.historyCursor < 0) state.historyCursor = 0;
                inputEl.value = state.history[state.history.length - 1 - state.historyCursor] || '';
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (state.historyCursor < 0) return;
                state.historyCursor -= 1;
                inputEl.value = state.historyCursor < 0
                    ? ''
                    : state.history[state.history.length - 1 - state.historyCursor] || '';
            }
        });

        // Racourcis globaux
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.activeElement === inputEl) {
                inputEl.value = '';
            }
        });
    }

    /** Soumission programmatique (utilisée par voiceAssistant.v2.js via window.jarvisConsole.submit). */
    function submitFromVoice(input) {
        return submit(input, { source: 'voice', voiceAcknowledge: true });
    }

    // API publique exposée au reste de la page
    window.jarvisConsole = {
        init,
        submit: submitFromVoice,
        submitRaw: (input) => submit(input, { source: 'api' }),
        clearHistory: (() => {
            clearHistory();
            const logsEl = $('jarvis-logs');
            if (logsEl) {
                const sep = el('div', 'text-[10px] font-mono text-rose-300/60 my-2',
                    '— historique effacé —');
                logsEl.appendChild(sep);
                logsEl.scrollTop = logsEl.scrollHeight;
            }
        }),
        buildCommandForAgent,
        getLastResult: () => state.lastResult,
        listAgents: async () => {
            const resp = await fetch(ENDPOINT_AGENTS);
            return resp.json();
        },
        health: async () => {
            const resp = await fetch(ENDPOINT_HEALTH);
            return resp.json();
        },
    };
})();
