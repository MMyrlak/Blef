const express = require('express');
const router = express.Router();
const db = require('../db/connection');

router.post('/create', async (req, res) => {
    const { name, password } = req.body;
    const passwordHash = require('crypto').createHash('sha256').update(password).digest('hex');
    const id = require('crypto').randomUUID();

    await db.execute('INSERT INTO lobbies (id, name, password_hash) VALUES (?, ?, ?)', [id, name, passwordHash]);
    res.json({ lobbyId: id });
})

module.exports = router;