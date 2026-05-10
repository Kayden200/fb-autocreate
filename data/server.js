require('dotenv').config();
const express = require('express');
const { runAutomation } = require('./core/browser');
const app = express();

app.use(express.static('public'));

app.get('/create-account', async (req, res) => {
    try {
        const result = await runAutomation();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));

