// === Assistant vocal Nour_Gravity v2.0 (chargement global) ===

// Création du bouton micro flottant
const micBtn = document.createElement('button');
micBtn.id = 'voice-mic-btn';
micBtn.title = 'Assistant vocal (appuyez pour parler)';
micBtn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="22" x2="12" y2="18"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`;
micBtn.style.position = 'fixed';
micBtn.style.right = '2.2rem';
micBtn.style.bottom = '2.2rem';
micBtn.style.zIndex = '9999';
micBtn.style.background = 'rgba(30,30,40,0.92)';
micBtn.style.border = 'none';
micBtn.style.borderRadius = '50%';
micBtn.style.width = '56px';
micBtn.style.height = '56px';
micBtn.style.boxShadow = '0 4px 16px #0008';
micBtn.style.cursor = 'pointer';
micBtn.style.display = 'flex';
micBtn.style.alignItems = 'center';
micBtn.style.justifyContent = 'center';
micBtn.style.transition = 'box-shadow 0.2s';
micBtn.style.outline = 'none';
micBtn.style.opacity = '0.92';
micBtn.style.backdropFilter = 'blur(2px)';
micBtn.style.userSelect = 'none';
micBtn.style.padding = '0';
micBtn.style.fontSize = '1.2rem';
micBtn.style.color = '#FBBF24';
micBtn.style.boxSizing = 'border-box';
micBtn.style.gap = '0';
micBtn.style.transition = 'background 0.2s, box-shadow 0.2s';
micBtn.addEventListener('mouseenter',()=>micBtn.style.boxShadow='0 6px 24px #FBBF24AA');
micBtn.addEventListener('mouseleave',()=>micBtn.style.boxShadow='0 4px 16px #0008');
document.body.appendChild(micBtn);

// Animation halo lors de l'écoute
const halo = document.createElement('div');
halo.id = 'voice-mic-halo';
halo.style.position = 'fixed';
halo.style.right = '2rem';
halo.style.bottom = '2rem';
halo.style.width = '64px';
halo.style.height = '64px';
halo.style.borderRadius = '50%';
halo.style.background = 'radial-gradient(circle, #FBBF2433 0%, #FBBF2400 80%)';
halo.style.zIndex = '9998';
halo.style.pointerEvents = 'none';
halo.style.opacity = '0';
halo.style.transition = 'opacity 0.2s';
document.body.appendChild(halo);

// Instanciation de l'assistant vocal
const va = new window.VoiceAssistant({
    onTranscript: (txt) => {
        // Affiche la commande vocale dans la console ou dans l'UI
        console.log('🎤 Commande vocale :', txt);
        // Exemple : va.speak('Vous avez dit : ' + txt);
        // Tu peux ici déclencher une action selon la commande reconnue
    },
    onStart: () => { halo.style.opacity = '1'; },
    onEnd: () => { halo.style.opacity = '0'; },
    lang: 'fr-FR'
});

// Gestion du clic sur le bouton micro
micBtn.addEventListener('click', () => {
    if (va.isListening) {
        va.stop();
    } else {
        va.listen();
    }
});

// Optionnel : touche raccourci (Espace maintenu)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !va.isListening) va.listen();
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && va.isListening) va.stop();
});
// === Fin assistant vocal ===
/**
 * NOUR_GRAVITY — Moteur d'interactivité, de flux séquentiel et d'Invocation Finale
 * Version Intégrale Connectée V3 — Protocole J.A.R.V.I.S
 *
 * Orchestre :
 *  - Boot sequence + initialisation du champ neuronal 5D
 *  - Effets antigravity 3D sur les cartes
 *  - Deux flux IA (matrice 99 + invocation finale)
 *  - Bursts neuronaux et statut HUD synchronisés avec les réponses API
 *  - Effet typewriter sur les essences générées
 */

let invocationStep = 1;
let neuralField = null;

document.addEventListener('DOMContentLoaded', () => {
    runBootSequence();
    neuralField = window.NourNeural && window.NourNeural.mount('neural-canvas');
    initAntigravityEffects();
    initApiFlux();
    initInvocationFinaleFlux();
});

/**
 * 🚀 BOOT SEQUENCE — logs défilants puis fade-out de l'overlay
 */
function runBootSequence() {
    const overlay = document.getElementById('boot-overlay');
    const log = document.getElementById('boot-log');
    if (!overlay || !log) return;

    const lines = [
        'Initialisation du champ neuronal…',
        'Calibrage de la matrice Al-Baqarah…',
        'Synchronisation avec la Source Unique…',
        'Tunnel sécurisé OK',
        'Alignement Nour_Gravity prêt.',
    ];
    let i = 0;
    log.textContent = lines[0];
    const handle = setInterval(() => {
        i++;
        if (i >= lines.length) {
            clearInterval(handle);
            setTimeout(() => overlay.classList.add('gone'), 350);
            return;
        }
        log.textContent = lines[i];
    }, 420);
}

/**
 * 🧠 Statut du champ neuronal (badge HUD)
 */
function setNeuralStatus(label, color) {
    const el = document.getElementById('neural-status');
    if (!el) return;
    el.textContent = label;
    el.style.color = color || '#a5f3fc';
}

/**
 * ✍️ TYPEWRITER — révèle un texte caractère par caractère dans une cellule
 */
function typewrite(targetEl, text, speed = 18) {
    if (!targetEl || !text) return;
    targetEl.textContent = '';
    targetEl.classList.add('typewriter');
    const caret = document.createElement('span');
    caret.className = 'caret';
    targetEl.appendChild(caret);
    let i = 0;
    const tick = () => {
        if (i >= text.length) {
            setTimeout(() => caret.remove(), 600);
            return;
        }
        caret.insertAdjacentText('beforebegin', text.charAt(i));
        i++;
        setTimeout(tick, speed);
    };
    tick();
}

/**
 * 💥 Déclenche une onde d'activation dans le champ neuronal
 * centrée sur la position d'un élément DOM (typiquement un bouton ou une ligne).
 */
function neuralBurstFromElement(el, energy = 1) {
    if (!neuralField || !el) return;
    const r = el.getBoundingClientRect();
    neuralField.burst(r.left + r.width / 2, r.top + r.height / 2, energy);
}

/**
 * 🪐 EFFETS ANTIGRAVITY (Micro-interactions physiques)
 */
function initAntigravityEffects() {
    const cards = document.querySelectorAll('.backdrop-blur-xl');
    
    cards.forEach(card => {
        card.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out';
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - (rect.width / 2);
            const y = e.clientY - rect.top - (rect.height / 2);
            
            const factor = 25; 
            const rotateX = -y / factor;
            const rotateY = x / factor;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            card.style.boxShadow = `0 20px 40px rgba(245, 158, 11, 0.05)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            card.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.37)';
        });
    });
}

/**
 * 🤲 FLUX 1 : SÉQUENCE DE L'INVOCATION 99
 */
function initApiFlux() {
    let generateBtn = document.getElementById('btn-generate');
    if (!generateBtn) {
        const buttons = document.querySelectorAll('button');
        for (let btn of buttons) {
            if (btn.innerText.includes("Générer via l'API") && !btn.id.includes('final')) {
                generateBtn = btn;
                break;
            }
        }
    }

    const tableBody = document.querySelector('tbody');
    const statusText = document.querySelector('.mt-8 span') || document.querySelector('footer span');
    const cycleBadge = document.querySelector('.text-amber-400.font-mono') || document.querySelector('[class*="CYCLE"]');

    if (!generateBtn || !tableBody) return;

    generateBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        generateBtn.disabled = true;
        generateBtn.innerText = `Émanation Étape ${invocationStep}...`;
        setNeuralStatus('SYNCING', '#fbbf24');
        neuralBurstFromElement(generateBtn, 0.6);

        if (statusText) {
            statusText.innerText = `Statut : Connexion au flux séquentiel (Étape ${invocationStep})...`;
            statusText.style.color = "#fbbf24";
        }

        const promptSpirituel = `Génère l'attribut numéro ${invocationStep} pour la matrice INVOCATION 99. 
Aligne son essence et ses caractéristiques sur la structure de la Sourate Al-Baqarah (286 versets, perfection du chiffre 7).
- Si l'étape est impaire : accentue le Temps de l'Action et la Législation.
- Si l'étape est paire : accentue la Transcendance et l'Unicité (Verset 163 ou Ayat al-Kursi 255).
Rédige le sens profond en français, sauf le champ "arabic".`;

        try {
            const response = await fetch('/api/flux-invocation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptSpirituel })
            });

            if (!response.ok) throw new Error(`Erreur Réseau: ${response.status}`);
            
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);

            const data = JSON.parse(result.raw);

            let typeColor = "text-amber-400";
            if (data.type === "LUMIÈRE") typeColor = "text-cyan-400 font-bold";
            if (data.type === "ACTION") typeColor = "text-emerald-400";
            if (data.type === "LÉGISLATION") typeColor = "text-purple-400";
            if (data.type === "SOUVERAINETÉ") typeColor = "text-rose-400 font-semibold";

            const newRow = document.createElement('tr');
            newRow.className = "fresh-row border-b border-white/5 hover:bg-white/[0.02] transition-all duration-500 transform translate-y-2 opacity-0";

            const meaningCellId = `meaning-${Date.now()}`;
            newRow.innerHTML = `
                <td class="py-4 px-3 font-mono text-xs">
                    <span class="block text-white/40">#0${invocationStep}</span>
                    <span class="${typeColor} text-[10px] tracking-widest block uppercase mt-0.5">${data.type || 'MATRICE'}</span>
                </td>
                <td class="py-4 px-3 font-serif text-right text-xl text-white/90 font-medium">${data.arabic || '—'}</td>
                <td class="py-4 px-3 italic text-white/60 text-sm">${data.transliteration || '—'}</td>
                <td id="${meaningCellId}" class="py-4 px-3 text-white/70 text-xs leading-relaxed max-w-md"></td>
            `;

            tableBody.appendChild(newRow);
            typewrite(newRow.querySelector(`#${meaningCellId}`), data.meaning || '—', 14);
            neuralBurstFromElement(newRow, 0.9);

            setTimeout(() => {
                newRow.classList.remove('translate-y-2', 'opacity-0');
            }, 50);

            invocationStep++;

            if (cycleBadge) {
                cycleBadge.innerText = `CYCLE VIBRATOIRE : ${7 + invocationStep}`;
            }

            generateBtn.disabled = false;
            generateBtn.innerText = "Générer via l'API";
            setNeuralStatus('ONLINE', '#a5f3fc');
            if (statusText) {
                statusText.innerText = `Statut : Étape ${invocationStep - 1} intégrée avec succès.`;
                statusText.style.color = "#34d399";
            }

        } catch (error) {
            console.error("Rupture du lien :", error);
            generateBtn.disabled = false;
            generateBtn.innerText = "Générer via l'API";
            setNeuralStatus('LINK LOST', '#f87171');
            if (statusText) {
                statusText.innerText = `Statut : Échec du flux - ${error.message}`;
                statusText.style.color = "#f87171";
            }
        }
    });
}

/**
 * 🔮 FLUX 2 : RESOLUTION — INVOCATION FINALE SUR-MESURE
 */
function initInvocationFinaleFlux() {
    const finalBtn = document.getElementById('btn-generate-final');
    const inputProblem = document.getElementById('input-problem');
    const finalTableBody = document.getElementById('final-table-body');
    const statusText = document.querySelector('.mt-8 span') || document.querySelector('footer span');

    if (!finalBtn || !inputProblem || !finalTableBody) {
        console.log("⚠️ Éléments HTML de l'Invocation Finale manquants. En attente de mise à jour de l'index.html.");
        return;
    }

    finalBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const problemeText = inputProblem.value.trim();
        if (!problemeText) {
            alert("Veuillez formuler votre épreuve ou problème avant d'interroger la Source.");
            return;
        }

        finalBtn.disabled = true;
        finalBtn.innerText = "Alchimie en cours...";
        setNeuralStatus('ALCHEMY', '#fbbf24');
        neuralBurstFromElement(finalBtn, 0.8);

        try {
            const response = await fetch('/api/invocation-finale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ probleme: problemeText })
            });

            if (!response.ok) throw new Error(`Erreur Serveur Final: ${response.status}`);
            
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);

            const data = JSON.parse(result.raw);

            // Création de la ligne curative dans le tableau final
            const newRow = document.createElement('tr');
            newRow.className = "fresh-row border-b border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] transition-all duration-700 transform translate-y-3 opacity-0";

            const essenceCellId = `essence-${Date.now()}`;
            newRow.innerHTML = `
                <td class="py-4 px-3 font-mono text-xs text-amber-400 font-semibold max-w-[120px] break-words">
                    ${data.problem_targeted || 'Épreuve Soumise'}
                </td>
                <td class="py-4 px-3 font-serif text-right text-2xl text-amber-300 font-medium">${data.arabic || '—'}</td>
                <td class="py-4 px-3 italic text-white/80 text-sm font-medium">${data.transliteration || '—'}</td>
                <td id="${essenceCellId}" class="py-4 px-3 text-white/90 text-xs leading-relaxed max-w-md border-l border-amber-500/10 pl-4"></td>
            `;

            // On vide l'ancienne invocation finale pour n'afficher que la dernière réponse souveraine
            finalTableBody.innerHTML = '';
            finalTableBody.appendChild(newRow);
            typewrite(newRow.querySelector(`#${essenceCellId}`), data.final_essence || '—', 12);
            neuralBurstFromElement(newRow, 1.0);

            setTimeout(() => {
                newRow.classList.remove('translate-y-3', 'opacity-0');
            }, 50);

            // Reset du champ de texte
            inputProblem.value = '';
            finalBtn.disabled = false;
            finalBtn.innerText = "Formuler l'Invocation Finale";
            setNeuralStatus('ONLINE', '#a5f3fc');

            if (statusText) {
                statusText.innerText = "Statut : Invocation Finale générée avec succès.";
                statusText.style.color = "#fbbf24"; // Ambre doré pour la finale
            }

        } catch (error) {
            console.error("Erreur Invocation Finale :", error);
            finalBtn.disabled = false;
            finalBtn.innerText = "Formuler l'Invocation Finale";
            setNeuralStatus('LINK LOST', '#f87171');
            if (statusText) {
                statusText.innerText = `Statut : Rupture du flux final - ${error.message}`;
                statusText.style.color = "#f87171";
            }
        }
    });
}