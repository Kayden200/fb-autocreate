/**
 * core/browser.js
 * The "Director" - Manages the browser, registration, and logic flow.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Import modular logic from other core files
const { getTempEmail, waitForCode } = require('./mailer');
const { verifyAccountStatus } = require('./validator');

puppeteer.use(StealthPlugin());

async function runAutomation() {
    // 1. Load Random Identity from data/identities.txt
    const identitiesPath = path.join(__dirname, '../data/identities.txt');
    const nameList = fs.readFileSync(identitiesPath, 'utf8')
        .split('\n')
        .filter(line => line.trim() !== "");
    
    const selectedLine = nameList[Math.floor(Math.random() * nameList.length)];
    const [firstName, lastName] = selectedLine.split(' ');
    
    const user = {
        first: firstName,
        last: lastName || "Skater", // Fallback surname
        pass: `User_${Math.floor(Math.random() * 10000)}!Safe`
    };

    // 2. Launch Stealth Browser (Optimized for Render/VPS)
    const browser = await puppeteer.launch({ 
        headless: "new", // Change to false if running on your PC to watch
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ] 
    });
    
    const page = await browser.newPage();
    
    try {
        // 3. Get Temp Mail Credentials via mailer.js
        console.log("Fetching temporary email...");
        const account = await getTempEmail();

        // 4. Navigate to Facebook Registration
        await page.goto('https://www.facebook.com/reg', { waitUntil: 'networkidle2' });

        // 5. Fill out the Form
        console.log(`Creating account for: ${user.first} ${user.last}`);
        await page.type('input[name="firstname"]', user.first);
        await page.type('input[name="lastname"]', user.last);
        await page.type('input[name="reg_email__"]', account.email);
        
        // Handle FB confirmation email field (appears after typing email)
        try {
            await page.waitForSelector('input[name="reg_email_confirmation__"]', { timeout: 2000 });
            await page.type('input[name="reg_email_confirmation__"]', account.email);
        } catch (e) { /* Field might not appear in all regions */ }

        await page.type('input[name="reg_passwd__"]', user.pass);

        // Randomize Birthday
        await page.select('select[id="day"]', String(Math.floor(Math.random() * 28) + 1));
        await page.select('select[id="month"]', String(Math.floor(Math.random() * 12) + 1));
        await page.select('select[id="year"]', String(Math.floor(Math.random() * 15) + 1995));

        // Submit Form
        await page.click('button[name="websubmit"]');

        // 6. Wait for OTP from mailer.js
        console.log("Waiting for Facebook OTP...");
        const otpCode = await waitForCode(account.token);
        
        await page.waitForSelector('input[name="code"]', { visible: true });
        await page.type('input[name="code"]', otpCode);
        await page.click('button[type="submit"]');

        // 7. Validation Step via validator.js
        const validation = await verifyAccountStatus(page);

        if (validation.status === "SUCCESS") {
            const logEntry = `${account.email}:${user.pass}:${user.first} ${user.last}`;
            
            // Save successful account to data folder
            fs.appendFileSync(path.join(__dirname, '../data/accounts_created.txt'), logEntry + "\n");
            
            return { success: true, message: "Account Created!", data: logEntry };
        } else {
            return { success: false, error: validation.message };
        }

    } catch (error) {
        console.error("Automation Error:", error.message);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

module.exports = { runAutomation };
