/**
 * Browser Automation Logic
 * Handles Puppeteer initialization and the Facebook registration flow.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Import our modular helper functions
const { getTempEmail, waitForCode } = require('./mailer');
const { verifyAccountStatus } = require('./validator');

puppeteer.use(StealthPlugin());

async function runAutomation() {
    // 1. Setup Random Identity from your data folder
    const identitiesPath = path.join(__dirname, '../data/identities.txt');
    const nameList = fs.readFileSync(identitiesPath, 'utf8').split('\n').filter(line => line.trim() !== "");
    const selectedName = nameList[Math.floor(Math.random() * nameList.length)].split(' ');
    
    const user = {
        first: selectedName[0],
        last: selectedName[1] || "Skater", // Fallback surname
        pass: `User_${Math.floor(Math.random() * 10000)}!Safe`
    };

    // 2. Launch Stealth Browser
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for background running on GitHub Actions
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    try {
        // 3. Get Temp Mail Credentials
        const account = await getTempEmail();
        console.log(`Using Email: ${account.email}`);

        // 4. Navigate to Facebook Registration
        await page.goto('https://www.facebook.com/reg', { waitUntil: 'networkidle2' });

        // 5. Fill out the Form
        await page.type('input[name="firstname"]', user.first);
        await page.type('input[name="lastname"]', user.last);
        await page.type('input[name="reg_email__"]', account.email);
        await page.type('input[name="reg_email_confirmation__"]', account.email); // FB often asks twice
        await page.type('input[name="reg_passwd__"]', user.pass);

        // Randomize Birthday (Crucial for bypassing bot detection)
        await page.select('select[id="day"]', String(Math.floor(Math.random() * 28) + 1));
        await page.select('select[id="month"]', String(Math.floor(Math.random() * 12) + 1));
        await page.select('select[id="year"]', String(Math.floor(Math.random() * 15) + 1995));

        // Submit Form
        await page.click('button[name="websubmit"]');

        // 6. Wait for and Enter OTP
        console.log("Waiting for OTP from Mail.tm...");
        const otpCode = await waitForCode(account.token);
        
        await page.waitForSelector('input[name="code"]', { visible: true });
        await page.type('input[name="code"]', otpCode);
        await page.click('button[type="submit"]');

        // 7. Validation Step
        const validation = await verifyAccountStatus(page);

        if (validation.status === "SUCCESS") {
            // Save successful account to data folder
            const logEntry = `${account.email}:${user.pass}:${user.first} ${user.last}\n`;
            fs.appendFileSync(path.join(__dirname, '../data/accounts_created.txt'), logEntry);
            
            return { success: true, data: logEntry.trim() };
        } else {
            return { success: false, error: validation.message };
        }

    } catch (error) {
        console.error("Automation Error:", error.message);
        return { success: false, error: error.message };
    } finally {
        // Always close browser to save RAM
        await browser.close();
    }
}

module.exports = { runAutomation };


