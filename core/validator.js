/**
 * Validator Logic
 * Checks if the Facebook account was successfully verified and created.
 */

async function verifyAccountStatus(page) {
    try {
        // 1. Wait to see if we are redirected to the Home/Welcome page
        // Facebook usually shows 'checkpoint' if blocked, or 'home' if successful.
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

        const url = page.url();

        // 2. Check for common success indicators
        if (url.includes("facebook.com/confirm") || url.includes("facebook.com/home")) {
            return { 
                status: "SUCCESS", 
                message: "Account verified and active." 
            };
        }

        // 3. Check for 'Checkpoint' (Account Disabled/Verification Loop)
        if (url.includes("checkpoint")) {
            return { 
                status: "FAILED", 
                message: "Account flagged or checkpoint triggered." 
            };
        }

        return { status: "UNKNOWN", message: "Redirected to unexpected page: " + url };

    } catch (error) {
        return { 
            status: "ERROR", 
            message: "Verification timed out or page failed to load." 
        };
    }
}

module.exports = { verifyAccountStatus };

