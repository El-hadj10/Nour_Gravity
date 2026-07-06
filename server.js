const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

const jarvis = require('./jarvis/delegator');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const apiKey = process.env.NOUR_GRAVITY_API_KEY || '';
const staticDir = path.join(__dirname, 'src');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(staticDir));


app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'Nour_Gravity', timestamp: new Date().toISOString() });
});

/**
 * ROUTE 1 : FLUX SÉQUENTIEL DE L'INVOCATION 99
 */
app.post('/api/flux-invocation', async (req, res) => {

    const prompt = typeof req.body?.prompt === 'string' && req.body.prompt.trim()
        ? req.body.prompt.trim()
        : 'Genere une invocation breve au format JSON.';

    return res.status(501).json({ ok: false, error: 'IA désactivée.' });
});

/**
 * ROUTE 2 : FLUX DE L'INVOCATION FINALE PERSONNALISÉE (RÉSOLUTION DES PROBLÈMES)
 */
app.post('/api/invocation-finale', async (req, res) => {

    const problemeUtilisateur = typeof req.body?.probleme === 'string' ? req.body.probleme.trim() : '';

    if (!problemeUtilisateur) {
        return res.status(400).json({ ok: false, error: "L'intention ou le problème ne peut pas être vide." });
    }

    // Prompt de haute précision pour cibler le problème
    const promptAlchimique = `L'utilisateur exprime cette épreuve / ce problème : "${problemeUtilisateur}". 
Génère une Invocation Finale salvatrice et sur-mesure au format JSON, directement adossée à l'énergie de l'INVOCATION 99 et aux secrets de la Sourate Al-Baqarah (Ancrage, Vicariat humain Al-Khilafa, Temps de l'Action ou l'Unicité de la Source Souveraine).`;

    return res.status(501).json({ ok: false, error: 'IA désactivée.' });
});

// =========================================================================
// J.A.R.V.I.S — Bus de délégation
// =========================================================================

app.get('/api/jarvis/agents', (_req, res) => {
    res.json({
        ok: true,
        agents: jarvis.listAgents(),
        allowlist: [...jarvis.BASHER_ALLOWLIST].sort(),
        delegator_target: {
            sibling: 'chasseur-onirique',
            cli: jarvis.CHASSEUR_ROOT,
        },
        dispatched_at: new Date().toISOString(),
    });
});

app.get('/api/jarvis/health', (_req, res) => {
    res.json({
        ok: true,
        agents_registered: jarvis.AGENTS.length,
        delegator_target: jarvis.CHASSEUR_ROOT,
        timestamp: new Date().toISOString(),
    });
});

app.post('/api/jarvis/command', async (req, res) => {
    const body = req.body || {};
    const input = typeof body.command === 'string'
        ? body.command
        : typeof body.text === 'string'
            ? body.text
            : '';
    const source = typeof body.source === 'string' ? body.source : 'console';

    if (!input.trim()) {
        return res.status(400).json({
            ok: false,
            error: 'Aucune commande reçue (champ "command" vide).',
        });
    }
    if (input.length > 1200) {
        return res.status(413).json({
            ok: false,
            error: 'Commande trop longue (>1200 caractères).',
        });
    }

    try {
        const result = await jarvis.dispatch(input, { source });
        res.json(result);
    } catch (err) {
        console.error('[JARVIS] echec dispatch:', err);
        res.status(500).json({
            ok: false,
            error: `Erreur interne du moteur J.A.R.V.I.S : ${err.message}`,
        });
    }
});

app.use((_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    const agents = jarvis.listAgents().map(a => a.name).join(', ');
    console.log(`Nour_Gravity server actif sur http://localhost:${PORT}`);
    console.log(`J.A.R.V.I.S core : ${jarvis.AGENTS.length} agents enregistrés (${agents})`);
    console.log(`Delegator cible  : ${jarvis.CHASSEUR_ROOT}`);
});