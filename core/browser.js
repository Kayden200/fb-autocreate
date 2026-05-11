/**
 * core/browser.js
 * Optimized for Cloud Deployment (Railway/Render)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Import modular logic
const { getTempEmail, waitForCode } = require('./mailer');
const { verifyAccountStatus } = require('./validator');

puppeteer.use(StealthPlugin());

async function runAutomation() {
    // 1. Load Random Identity mula sa data folder
    const identitiesPath = path.join(__dirname, '../data/identities.txt');
    let nameList = ["Skater", "Onyx"]; // Default fallback
    
    if (fs.existsSync(identitiesPath)) {
        nameList = fs.readFileSync(identitiesPath, 'utf8').split('\n').filter(l => l.trim() !== "");
    }
    
    const selectedLine = nameList[Math.floor(Math.random() * nameList.length)];
    const [firstName, lastName] = selectedLine.split(' ');
    
    const user = {
        first: firstName || "User",
        last: lastName || "Skater",
        pass: `Pass_${Math.floor(Math.random() * 9999)}!X`
    };

    // 2. Launch Browser - OPTIMIZED FOR RAILWAY/CLOUD
    const browser = await puppeteer.launch({ 
        headless: "new", // "new" is mandatory for cloud servers
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Importante ito para sa Railway Nixpacks
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ] 
    });
    
    const page = await browser.newPage();
    
    try {
        // 3. Get Temp Mail
        console.log("Setting up temp mail...");
        const account = await getTempEmail();

        // 4. Go to FB Registration
        console.log(`Registering: ${user.first} ${user.last}`);
        await page.goto('https://www.facebook.com/reg', { waitUntil: 'networkidle2' });

        // 5. Fill Form
        await page.type('input[name="firstname"]', user.first);
        await page.type('input[name="lastname"]', user.last);
        await page.type('input[name="reg_email__"]', account.email);
        
        // Minsan lumalabas ang confirmation field
        try {
            await page.waitForSelector('input[name="reg_email_confirmation__"]', { timeout: 2000 });
            await page.type('input[name="reg_email_confirmation__"]', account.email);
        } catch (e) {}

        await page.type('input[name="reg_passwd__"]', user.pass);

        // Randomize Birthday (1990-2005)
        await page.select('select[id="day"]', String(Math.floor(Math.random() * 28) + 1));
        await page.select('select[id="month"]', String(Math.floor(Math.random() * 12) + 1));
        await page.select('select[id="year"]', String(Math.floor(Math.random() * 15) + 1990));

        await page.click('button[name="websubmit"]');

        // 6. Get & Enter OTP
        console.log("Waiting for FB OTP code...");
        const otpCode = await waitForCode(account.token);
        
        await page.waitForSelector('input[name="code"]', { visible: true, timeout: 60000 });
        await page.type('input[name="code"]', otpCode);
        await page.click('button[type="submit"]');

        // 7. Verify Result
        const validation = await verifyAccountStatus(page);

        if (validation.status === "SUCCESS") {
            const logEntry = `${account.email}:${user.pass}:${user.first} ${user.last}\n`;
            fs.appendFileSync(path.join(__dirname, '../data/accounts_created.txt'), logEntry);
            return { success: true, message: "Created!", data: logEntry.trim() };
        } else {
            return { success: false, error: validation.message };
        }

    } catch (error) {
        console.error("Browser Error:", error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

module.exports = { runAutomation };
