const express = require('express');
const dotenv = require('dotenv');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const apiKey = process.env.NOUR_GRAVITY_API_KEY || '';
const staticDir = path.join(__dirname, 'src');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(staticDir));

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'Nour_Gravity', timestamp: new Date().toISOString() });
});

/**
 * ROUTE 1 : FLUX SÉQUENTIEL DE L'INVOCATION 99
 */
app.post('/api/flux-invocation', async (req, res) => {
    if (!anthropic) {
        return res.status(500).json({ ok: false, error: "NOUR_GRAVITY_API_KEY est absente dans .env" });
    }

    const prompt = typeof req.body?.prompt === 'string' && req.body.prompt.trim()
        ? req.body.prompt.trim()
        : 'Genere une invocation breve au format JSON.';

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 600,
            temperature: 0.5,
            system: `Tu es le moteur d'élite de la matrice Nour_Gravity. Tu génères exclusivement un JSON valide, sans mise en forme markdown (n'ajoute jamais de balises de code).
Format attendu obligatoirement :
{
    "name": "INVOCATION 99",
    "type": "Spécifier la nature parmi : ACTION, LÉGISLATION, LUMIÈRE, SOUVERAINETÉ",
    "arabic": "Texte en arabe avec voyelles",
    "transliteration": "Translittération phonétique rigoureuse",
    "meaning": "Analyse profonde de l'essence en français, liée aux thèmes d'Al-Baqarah (Al-Khilafa, soumission, ou l'Unicité de la Source)."
}`,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim();

        return res.json({ ok: true, raw: text });
    } catch (error) {
        return res.status(502).json({ ok: false, error: error?.message || 'Erreur API Anthropic' });
    }
});

/**
 * ROUTE 2 : FLUX DE L'INVOCATION FINALE PERSONNALISÉE (RÉSOLUTION DES PROBLÈMES)
 */
app.post('/api/invocation-finale', async (req, res) => {
    if (!anthropic) {
        return res.status(500).json({ ok: false, error: "NOUR_GRAVITY_API_KEY est absente dans .env" });
    }

    const problemeUtilisateur = typeof req.body?.probleme === 'string' ? req.body.probleme.trim() : '';

    if (!problemeUtilisateur) {
        return res.status(400).json({ ok: false, error: "L'intention ou le problème ne peut pas être vide." });
    }

    // Prompt de haute précision pour cibler le problème
    const promptAlchimique = `L'utilisateur exprime cette épreuve / ce problème : "${problemeUtilisateur}". 
Génère une Invocation Finale salvatrice et sur-mesure au format JSON, directement adossée à l'énergie de l'INVOCATION 99 et aux secrets de la Sourate Al-Baqarah (Ancrage, Vicariat humain Al-Khilafa, Temps de l'Action ou l'Unicité de la Source Souveraine).`;

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 800,
            temperature: 0.4, // Plus bas pour assurer une réponse solennelle et ciblée
            system: `Tu es le consolateur et le moteur d'élite de Nour_Gravity. Tu analyses le problème de l'utilisateur et tu conçois une Invocation Finale en réponse directe. Renvoie exclusivement un JSON brut sans markdown.
Format strict exigé :
{
    "problem_targeted": "Bref rappel de l'épreuve analysée",
    "arabic": "L'invocation sur-mesure en arabe avec toutes ses voyelles (Harakat)",
    "transliteration": "Translittération phonétique rigoureuse",
    "final_essence": "Explication puissante en français de pourquoi cette invocation et cet attribut de la Source Unique détruisent ou apaisent le problème mentionné, en résonance avec Al-Baqarah."
}`,
            messages: [{ role: 'user', content: promptAlchimique }],
        });

        const text = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim();

        return res.json({ ok: true, raw: text });
    } catch (error) {
        return res.status(502).json({ ok: false, error: error?.message || 'Erreur API Anthropic lors de l\'Invocation Finale' });
    }
});

app.use((_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Nour_Gravity server actif sur http://localhost:${PORT}`);
});