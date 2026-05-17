/**
 * NOUR_GRAVITY — Moteur d'interactivité et de flux
 * Alignement structurel et gestion de la matrice active
 */

document.addEventListener('DOMContentLoaded', () => {
    initAntigravityEffects();
    initApiSimulation();
});

/**
 * 🪐 EFFETS ANTIGRAVITY (Micro-interactions physiques)
 * Crée un effet de parallaxe et de flottaison 3D fluide sur les cartes au survol de la souris
 */
function initAntigravityEffects() {
    const cards = document.querySelectorAll('.backdrop-blur-xl');
    
    cards.forEach(card => {
        card.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out';
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            // Calcul de la position de la souris relative au centre de la carte
            const x = e.clientX - rect.left - (rect.width / 2);
            const y = e.clientY - rect.top - (rect.height / 2);
            
            // Intensité de la rotation (plus le diviseur est grand, plus c'est subtil)
            const factor = 25; 
            const rotateX = -y / factor;
            const rotateY = x / factor;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            card.style.boxShadow = `0 20px 40px rgba(245, 158, 11, 0.05)`;
        });
        
        card.addEventListener('mouseleave', () => {
            // Retour fluide à l'état de flottaison initial
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            card.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.37)';
        });
    });
}

/**
 * 🤲 SIMULATION DU FLUX DE L'API
 * Gère l'action du bouton ciblé par ID et l'injection lumineuse dans la matrice INVOCATION 99
 */
function initApiSimulation() {
    // Sélection précise et professionnelle via les ID et balises du front corrigé
    const generateBtn = document.getElementById('btn-generate');
    const tableBody = document.querySelector('tbody');
    const statusText = document.querySelector('.mt-8.pt-4 span:first-child');

    if (!generateBtn || !tableBody) return;

    generateBtn.addEventListener('click', () => {
        // Changement d'état visuel du bouton (Mode chargement sécurisé)
        generateBtn.disabled = true;
        generateBtn.innerText = "Connexion au flux...";
        
        if (statusText) {
            statusText.innerText = "Statut : Requête chiffrée en cours...";
            statusText.classList.remove('text-emerald-400');
            statusText.classList.add('text-amber-400');
        }

        // Simulation du temps de traitement par le Cloud protecteur (1.5 seconde)
        setTimeout(() => {
            // Création de la nouvelle ligne de la matrice standardisée
            const newRow = document.createElement('tr');
            newRow.className = "border-b border-white/5 hover:bg-white/[0.01] transition-colors opacity-0 translate-y-4 duration-700 ease-out";
            
            // Injection des données de la session avec translittération rigoureuse
            newRow.innerHTML = `
                <td class="py-4 px-3 font-semibold text-amber-400 font-mono text-xs">INVOCATION 99</td>
                <td class="py-4 px-3 font-serif text-right text-xl text-white/90">الْخَالِقُ</td>
                <td class="py-4 px-3 italic text-white/60">Al-Khâliq</td>
                <td class="py-4 px-3 text-white/70 leading-relaxed">Le Créateur, Celui qui détermine la mesure de toute chose. Alignement direct avec le chiffre 7 de la création et de la perfection.</td>
            `;

            // Ajout de la ligne au tableau actif
            tableBody.appendChild(newRow);

            // Déclenchement de la transition fluide style Antigravity (Fade-in + Slide-up)
            setTimeout(() => {
                newRow.classList.remove('opacity-0', 'translate-y-4');
                newRow.classList.add('opacity-100', 'translate-y-0');
            }, 50);

            // Restauration des contrôles du front
            generateBtn.disabled = false;
            generateBtn.innerText = "Générer via l'API";
            
            if (statusText) {
                statusText.innerText = "Statut : Matrice mise à jour avec succès";
                statusText.classList.remove('text-amber-400');
                statusText.classList.add('text-emerald-400');
            }

        }, 1500);
    });
}