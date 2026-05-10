const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getTempEmail, waitForCode } = require('./mailer');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function runAutomation() {
    const names = fs.readFileSync(path.join(__dirname, '../data/identities.txt'), 'utf8').split('\n');
    const randomName = names[Math.floor(Math.random() * names.length)].split(' ');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        const account = await getTempEmail();
        await page.goto('https://www.facebook.com/reg');
        
        await page.type('input[name="firstname"]', randomName[0]);
        await page.type('input[name="lastname"]', randomName[1]);
        await page.type('input[name="reg_email__"]', account.email);
        await page.type('input[name="reg_passwd__"]', 'Skater_2026_Auto');
        
        // Add birthday logic here
        await page.click('button[name="websubmit"]');
        
        const code = await waitForCode(account.token);
        return { success: true, email: account.email, code: code };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        await browser.close();
    }
}

module.exports = { runAutomation };

