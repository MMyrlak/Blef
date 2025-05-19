const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.post('/create', async (req, res) => {
    const { name, password, isOpen } = req.body;
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    let id;
    let isUnique = false;

    while (!isUnique) {
        id = crypto.randomUUID();
        const [rows] = await db.execute('SELECT id FROM lobbies WHERE id = ?', [id]);
        if (rows.length === 0) {
            isUnique = true;
        }
    }

    await db.execute('INSERT INTO lobbies (id, name, password_hash, isOpen) VALUES (?, ?, ?, ?)', [id, name, passwordHash, isOpen]);
    res.json({ lobbyId: id });
});

router.get('/getLobby', async(req, res) =>{
    try {
        const [rows] = await db.execute('SELECT * FROM `lobbies` WHERE `isOpen` = 1');

        if(rows.length === 0 ){
            return res.status(404).json({error: "Brak lobby"});
        }

        res.status(200).json({rows});
    } catch (err) {
        console.error("Błąd serwera: ", err);
        res.status(500).json({ error: "Błąd serwera"});
    }
});
module.exports = router;