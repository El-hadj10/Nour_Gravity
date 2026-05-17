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

app.post('/api/flux-invocation', async (req, res) => {
    if (!anthropic) {
        return res.status(500).json({
            ok: false,
            error: "NOUR_GRAVITY_API_KEY est absente dans .env",
        });
    }

    const prompt = typeof req.body?.prompt === 'string' && req.body.prompt.trim()
        ? req.body.prompt.trim()
        : 'Genere une invocation breve au format JSON.';

    try {
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            temperature: 0.3,
            system:
                'Tu reponds uniquement avec un JSON valide, sans markdown. Format attendu: {"name":"...","arabic":"...","transliteration":"...","meaning":"..."}.',
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim();

        return res.json({ ok: true, raw: text });
    } catch (error) {
        return res.status(502).json({
            ok: false,
            error: error?.message || 'Erreur API Anthropic',
        });
    }
});

app.use((_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Nour_Gravity server actif sur http://localhost:${PORT}`);
});