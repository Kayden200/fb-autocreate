const axios = require('axios');
const API = "https://api.mail.tm";

async function getTempEmail() {
    const domain = (await axios.get(`${API}/domains`)).data['hydra:member'][0].domain;
    const email = `user${Date.now()}@${domain}`;
    const password = "password123";
    await axios.post(`${API}/accounts`, { address: email, password });
    const token = (await axios.post(`${API}/token`, { address: email, password })).data.token;
    return { email, token };
}

async function waitForCode(token) {
    for (let i = 0; i < 10; i++) {
        const res = await axios.get(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` }});
        const msg = res.data['hydra:member'].find(m => m.intro.includes("Facebook"));
        if (msg) return msg.intro.match(/\d{6}/)[0];
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error("OTP Timeout");
}

module.exports = { getTempEmail, waitForCode };

