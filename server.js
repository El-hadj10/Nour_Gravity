const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

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

app.use((_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Nour_Gravity server actif sur http://localhost:${PORT}`);
});