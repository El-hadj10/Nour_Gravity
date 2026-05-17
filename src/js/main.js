/**
 * NOUR_GRAVITY — Moteur d'interactivité, de flux séquentiel et d'Invocation Finale
 * Version Intégrale Connectée V2
 */

document.addEventListener('DOMContentLoaded', () => {
    initAntigravityEffects();
    initApiFlux();
    initInvocationFinaleFlux();
});

let invocationStep = 1;

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
            newRow.className = "border-b border-white/5 hover:bg-white/[0.02] transition-all duration-500 transform translate-y-2 opacity-0";
            
            newRow.innerHTML = `
                <td class="py-4 px-3 font-mono text-xs">
                    <span class="block text-white/40">#0${invocationStep}</span>
                    <span class="${typeColor} text-[10px] tracking-widest block uppercase mt-0.5">${data.type || 'MATRICE'}</span>
                </td>
                <td class="py-4 px-3 font-serif text-right text-xl text-white/90 font-medium">${data.arabic || '—'}</td>
                <td class="py-4 px-3 italic text-white/60 text-sm">${data.transliteration || '—'}</td>
                <td class="py-4 px-3 text-white/70 text-xs leading-relaxed max-w-md">${data.meaning || '—'}</td>
            `;

            tableBody.appendChild(newRow);
            
            setTimeout(() => {
                newRow.classList.remove('translate-y-2', 'opacity-0');
            }, 50);

            invocationStep++;
            
            if (cycleBadge) {
                cycleBadge.innerText = `CYCLE VIBRATOIRE : ${7 + invocationStep}`;
            }

            generateBtn.disabled = false;
            generateBtn.innerText = "Générer via l'API";
            if (statusText) {
                statusText.innerText = `Statut : Étape ${invocationStep - 1} intégrée avec succès.`;
                statusText.style.color = "#34d399"; 
            }

        } catch (error) {
            console.error("Rupture du lien :", error);
            generateBtn.disabled = false;
            generateBtn.innerText = "Générer via l'API";
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
            newRow.className = "border-b border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] transition-all duration-700 transform translate-y-3 opacity-0";
            
            newRow.innerHTML = `
                <td class="py-4 px-3 font-mono text-xs text-amber-400 font-semibold max-w-[120px] break-words">
                    ${data.problem_targeted || 'Épreuve Soumise'}
                </td>
                <td class="py-4 px-3 font-serif text-right text-2xl text-amber-300 font-medium">${data.arabic || '—'}</td>
                <td class="py-4 px-3 italic text-white/80 text-sm font-medium">${data.transliteration || '—'}</td>
                <td class="py-4 px-3 text-white/90 text-xs leading-relaxed max-w-md border-l border-amber-500/10 pl-4">${data.final_essence || '—'}</td>
            `;

            // On vide l'ancienne invocation finale pour n'afficher que la dernière réponse souveraine
            finalTableBody.innerHTML = '';
            finalTableBody.appendChild(newRow);
            
            setTimeout(() => {
                newRow.classList.remove('translate-y-3', 'opacity-0');
            }, 50);

            // Reset du champ de texte
            inputProblem.value = '';
            finalBtn.disabled = false;
            finalBtn.innerText = "Formuler l'Invocation Finale";
            
            if (statusText) {
                statusText.innerText = "Statut : Invocation Finale générée avec succès.";
                statusText.style.color = "#fbbf24"; // Ambre doré pour la finale
            }

        } catch (error) {
            console.error("Erreur Invocation Finale :", error);
            finalBtn.disabled = false;
            finalBtn.innerText = "Formuler l'Invocation Finale";
            if (statusText) {
                statusText.innerText = `Statut : Rupture du flux final - ${error.message}`;
                statusText.style.color = "#f87171";
            }
        }
    });
}