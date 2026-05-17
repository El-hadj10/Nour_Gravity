/**
 * NOUR_GRAVITY — Champ Neuronal 5D
 * Canvas plein-écran : neurones en 3D (perspective) + signaux pulsés (temps)
 * + déformation réactive au curseur (champ de force) = "5D" perçue.
 *
 * Aucune dépendance. Performant : requestAnimationFrame, devicePixelRatio,
 * recalibrage automatique sur resize, limitation de population sur mobile.
 */
(function () {
    'use strict';

    const TAU = Math.PI * 2;

    const CONFIG = {
        nodeCountDesktop: 140,
        nodeCountMobile: 60,
        connectionRadius: 150,    // distance max (en pixels projetés) pour qu'une synapse existe
        mouseInfluence: 220,      // rayon du champ de force du curseur
        mouseStrength: 55,        // intensité de répulsion / déformation
        depth: 900,               // profondeur Z totale du champ
        focal: 600,               // distance focale (projection perspective)
        rotationSpeed: 0.00018,   // rotation lente automatique du champ
        pulseSpawnChance: 0.018,  // probabilité par frame qu'un nœud émette un signal
        pulseSpeed: 0.022,        // progression [0..1] par frame d'un signal le long d'une synapse
        baseColor: [120, 200, 255],   // cyan Jarvis
        accentColor: [251, 191, 36],  // ambre Nour
        signalColor: [255, 240, 200],
    };

    class NeuralField {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: true });
            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.mouse = { x: -9999, y: -9999, active: false };
            this.rotation = { x: 0, y: 0 };
            this.targetRotation = { x: 0, y: 0 };
            this.nodes = [];
            this.pulses = [];
            this.frame = 0;
            this.running = false;

            this.handleResize = this.handleResize.bind(this);
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseLeave = this.handleMouseLeave.bind(this);
            this.handleTouch = this.handleTouch.bind(this);
            this.loop = this.loop.bind(this);
        }

        init() {
            this.handleResize();
            this.seedNodes();

            window.addEventListener('resize', this.handleResize, { passive: true });
            window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
            window.addEventListener('mouseleave', this.handleMouseLeave, { passive: true });
            window.addEventListener('touchmove', this.handleTouch, { passive: true });
            window.addEventListener('touchend', this.handleMouseLeave, { passive: true });

            this.running = true;
            requestAnimationFrame(this.loop);
        }

        seedNodes() {
            const isMobile = Math.min(this.width, this.height) < 700;
            const count = isMobile ? CONFIG.nodeCountMobile : CONFIG.nodeCountDesktop;
            const half = CONFIG.depth / 2;
            this.nodes = [];
            for (let i = 0; i < count; i++) {
                this.nodes.push({
                    x: (Math.random() - 0.5) * this.width * 1.6,
                    y: (Math.random() - 0.5) * this.height * 1.6,
                    z: (Math.random() - 0.5) * CONFIG.depth,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: (Math.random() - 0.5) * 0.15,
                    vz: (Math.random() - 0.5) * 0.25,
                    phase: Math.random() * TAU,
                    // valeur d'activation (montée à 1 quand traversé par un signal, retombe doucement)
                    energy: 0,
                });
            }
        }

        handleResize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.width = w;
            this.height = h;
            this.canvas.width = w * this.dpr;
            this.canvas.height = h * this.dpr;
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        handleMouseMove(e) {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.active = true;
            // la souris incline aussi la rotation globale du champ → effet "5D"
            this.targetRotation.y = ((e.clientX / this.width) - 0.5) * 0.6;
            this.targetRotation.x = ((e.clientY / this.height) - 0.5) * -0.4;
        }

        handleTouch(e) {
            if (e.touches && e.touches[0]) {
                this.handleMouseMove(e.touches[0]);
            }
        }

        handleMouseLeave() {
            this.mouse.active = false;
            this.mouse.x = -9999;
            this.mouse.y = -9999;
            this.targetRotation.x = 0;
            this.targetRotation.y = 0;
        }

        project(node) {
            // rotation Y (autour de l'axe vertical) puis X (autour de l'axe horizontal)
            const cosY = Math.cos(this.rotation.y);
            const sinY = Math.sin(this.rotation.y);
            const cosX = Math.cos(this.rotation.x);
            const sinX = Math.sin(this.rotation.x);

            let x = node.x * cosY - node.z * sinY;
            let z = node.x * sinY + node.z * cosY;
            let y = node.y * cosX - z * sinX;
            z = node.y * sinX + z * cosX;

            const scale = CONFIG.focal / (CONFIG.focal + z);
            return {
                sx: this.width / 2 + x * scale,
                sy: this.height / 2 + y * scale,
                scale,
                z,
            };
        }

        update() {
            this.frame++;

            // lissage de la rotation cible
            this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.04;
            this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.04 + CONFIG.rotationSpeed;

            for (const n of this.nodes) {
                n.x += n.vx;
                n.y += n.vy;
                n.z += n.vz;
                n.phase += 0.018;
                n.energy *= 0.94;

                // confinement souple : les nœuds rebondissent doucement aux bords du volume
                const limX = this.width * 0.9;
                const limY = this.height * 0.9;
                const limZ = CONFIG.depth / 2;
                if (n.x > limX || n.x < -limX) n.vx *= -1;
                if (n.y > limY || n.y < -limY) n.vy *= -1;
                if (n.z > limZ || n.z < -limZ) n.vz *= -1;
            }

            // émission probabiliste de signaux entre nœuds voisins
            if (this.pulses.length < 80 && Math.random() < CONFIG.pulseSpawnChance * this.nodes.length / 50) {
                const a = (Math.random() * this.nodes.length) | 0;
                const b = (Math.random() * this.nodes.length) | 0;
                if (a !== b) {
                    this.pulses.push({ from: a, to: b, t: 0 });
                }
            }

            // avancement des signaux
            for (let i = this.pulses.length - 1; i >= 0; i--) {
                const p = this.pulses[i];
                p.t += CONFIG.pulseSpeed;
                if (p.t >= 1) {
                    this.nodes[p.to].energy = 1;
                    this.pulses.splice(i, 1);
                }
            }
        }

        draw() {
            const ctx = this.ctx;
            // trace persistant : on n'efface pas brutalement, on assombrit → traînées légères
            ctx.fillStyle = 'rgba(11, 12, 16, 0.22)';
            ctx.fillRect(0, 0, this.width, this.height);

            // 1) projection préalable (réutilisée pour synapses + nœuds + pulses)
            const projected = new Array(this.nodes.length);
            for (let i = 0; i < this.nodes.length; i++) {
                const proj = this.project(this.nodes[i]);

                // champ de force du curseur : déformation locale x,y dans l'espace écran
                if (this.mouse.active) {
                    const dx = proj.sx - this.mouse.x;
                    const dy = proj.sy - this.mouse.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < CONFIG.mouseInfluence && d > 0.001) {
                        const force = (1 - d / CONFIG.mouseInfluence) * CONFIG.mouseStrength;
                        proj.sx += (dx / d) * force;
                        proj.sy += (dy / d) * force;
                        // halo d'activation près du curseur
                        this.nodes[i].energy = Math.max(this.nodes[i].energy, 1 - d / CONFIG.mouseInfluence);
                    }
                }

                projected[i] = proj;
            }

            // 2) synapses (lignes entre voisins) — opacité dépend de la distance projetée + profondeur
            const r = CONFIG.connectionRadius;
            const [br, bg, bb] = CONFIG.baseColor;
            for (let i = 0; i < this.nodes.length; i++) {
                const pi = projected[i];
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const pj = projected[j];
                    const dx = pi.sx - pj.sx;
                    const dy = pi.sy - pj.sy;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < r * r) {
                        const d = Math.sqrt(d2);
                        const fade = 1 - d / r;
                        const depthAvg = (pi.scale + pj.scale) * 0.5;
                        const alpha = fade * fade * depthAvg * 0.32;
                        ctx.strokeStyle = `rgba(${br},${bg},${bb},${alpha})`;
                        ctx.lineWidth = 0.6 * depthAvg;
                        ctx.beginPath();
                        ctx.moveTo(pi.sx, pi.sy);
                        ctx.lineTo(pj.sx, pj.sy);
                        ctx.stroke();
                    }
                }
            }

            // 3) signaux pulsés (points lumineux qui se déplacent le long des synapses)
            const [sr, sg, sb] = CONFIG.signalColor;
            for (const p of this.pulses) {
                const a = projected[p.from];
                const b = projected[p.to];
                if (!a || !b) continue;
                const x = a.sx + (b.sx - a.sx) * p.t;
                const y = a.sy + (b.sy - a.sy) * p.t;
                const scale = a.scale + (b.scale - a.scale) * p.t;
                ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.9 * scale})`;
                ctx.beginPath();
                ctx.arc(x, y, 2.2 * scale, 0, TAU);
                ctx.fill();
            }

            // 4) nœuds : taille selon profondeur, couleur interpolée selon énergie (cyan → ambre)
            const [ar, ag, ab] = CONFIG.accentColor;
            for (let i = 0; i < this.nodes.length; i++) {
                const n = this.nodes[i];
                const p = projected[i];
                const e = n.energy;
                const pulse = 1 + Math.sin(n.phase) * 0.25;
                let radius = (1.6 + e * 2.4) * p.scale * pulse;
                if (radius < 0.1) radius = 0.1;

                const rC = Math.round(br + (ar - br) * e);
                const gC = Math.round(bg + (ag - bg) * e);
                const bC = Math.round(bb + (ab - bb) * e);

                // halo si nœud actif
                if (e > 0.05) {
                    let haloRadius = radius * 6;
                    if (haloRadius < 0.1) haloRadius = 0.1;
                    const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, haloRadius);
                    grd.addColorStop(0, `rgba(${rC},${gC},${bC},${0.45 * e})`);
                    grd.addColorStop(1, `rgba(${rC},${gC},${bC},0)`);
                    ctx.fillStyle = grd;
                    ctx.beginPath();
                    ctx.arc(p.sx, p.sy, haloRadius, 0, TAU);
                    ctx.fill();
                }

                ctx.fillStyle = `rgba(${rC},${gC},${bC},${0.7 + 0.3 * e})`;
                ctx.beginPath();
                ctx.arc(p.sx, p.sy, radius, 0, TAU);
                ctx.fill();
            }
        }

        loop() {
            if (!this.running) return;
            this.update();
            this.draw();
            requestAnimationFrame(this.loop);
        }

        // déclenche une vague d'activation centrée sur (x,y) écran — appelée lors d'un succès API
        burst(x, y, energy = 1) {
            for (let i = 0; i < this.nodes.length; i++) {
                const p = this.project(this.nodes[i]);
                const dx = p.sx - x;
                const dy = p.sy - y;
                const d = Math.sqrt(dx * dx + dy * dy);
                const reach = Math.min(this.width, this.height) * 0.6;
                if (d < reach) {
                    this.nodes[i].energy = Math.max(this.nodes[i].energy, energy * (1 - d / reach));
                }
            }
        }
    }

    // exposition globale (pas de module bundler dans ce projet)
    window.NourNeural = {
        mount(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn('[Nour] Canvas neuronal introuvable:', canvasId);
                return null;
            }
            const field = new NeuralField(canvas);
            field.init();
            return field;
        },
    };
})();
