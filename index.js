import express from 'express';
import fetch from 'node-fetch';

// --- Variables d'Environnement pour le PROXY ---

const RENDER_API_URL = process.env.RENDER_API_URL; 
const RENDER_API_KEY = process.env.RENDER_API_KEY; 
const ROBLOX_SECRET = process.env.ROBLOX_SECRET; 

// NOUVEAU: Ta "DB interne" d'utilisateurs autorisés
// Dans Render, tu la mettras sous forme de "12345,67890,54321"
const ALLOWED_USER_IDS_STRING = process.env.ALLOWED_USER_IDS || "";
const ALLOWED_USER_IDS = new Set(ALLOWED_USER_IDS_STRING.split(','));

const PORT = process.env.PORT || 10001;

const app = express();

app.get('/getdata', async (req, res) => {
    console.log("Nouvelle requête reçue pour /getdata");

    // --- ÉTAPE 1 : VÉRIFICATION DU JEU (Le Gardien) ---
    const robloxAuth = req.headers['x-roblox-secret'];
    if (!ROBLOX_SECRET || !robloxAuth || robloxAuth !== ROBLOX_SECRET) {
        console.warn("[SECURITY] Requête bloquée : Mauvaise clé ROBLOX.");
        return res.status(401).json({ error: 'Unauthorized (Bad Game Key)' });
    }

    // --- ÉTAPE 2 : VÉRIFICATION DU JOUEUR (La "DB Interne") ---
    const userId = req.headers['x-roblox-user-id'];
    if (!userId) {
        console.warn("[SECURITY] Requête bloquée : UserID manquant.");
        return res.status(401).json({ error: 'Unauthorized (Missing UserID)' });
    }

    if (!ALLOWED_USER_IDS.has(userId)) {
        console.warn(`[SECURITY] Requête bloquée : UserID ${userId} non autorisé.`);
        return res.status(403).json({ error: 'Forbidden (User not whitelisted)' });
    }

    console.log(`[SECURITY] UserID ${userId} autorisé. Contact du bot Render...`);

    // --- ÉTAPE 3 : APPEL AU BOT (Le Gardien va au Coffre) ---
    if (!RENDER_API_URL || !RENDER_API_KEY) {
        console.error("ERREUR: Proxy non configuré.");
        return res.status(500).json({ error: 'Internal server error' });
    }

    try {
        const response = await fetch(RENDER_API_URL, {
            headers: {
                'Authorization': `Bearer ${RENDER_API_KEY}`
            }
        });

        if (!response.ok) {
            // ... (gestion d'erreur)
            const errorText = await response.text();
            console.error(`Erreur de l'API Render : ${response.status}. Réponse: ${errorText}`);
            return res.status(response.status).json({ error: 'Failed to fetch data from upstream' });
        }

        const data = await response.json();
        
        console.log("Données récupérées avec succès. Envoi au client.");
        res.json(data);

    } catch (error) {
        console.error("Erreur de connexion à l'API Render:", error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Démarrage ---
app.listen(PORT, () => {
    console.log(`Serveur PROXY démarré sur 0.0.0.0:${PORT}...`);
    if (!ROBLOX_SECRET) console.warn("AVERTISSEMENT: 'ROBLOX_SECRET' n'est pas définie.");
    if (ALLOWED_USER_IDS_STRING === "") console.warn("AVERTISSEMENT: 'ALLOWED_USER_IDS' n'est pas définie. Personne ne peut se connecter.");
    console.log(`Utilisateurs autorisés : ${ALLOWED_USER_IDS_STRING}`);
});
