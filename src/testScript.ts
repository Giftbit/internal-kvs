import crypto = require("crypto");
import readline = require("readline");
import superagent = require("superagent");

const testUrl = "https://api.lightraildev.net/v1/storage/healthCheck";

let shouldExit = false;

process.on("SIGINT", function() {
    console.log("\nCaught interrupt signal");
    shouldExit = true;
});

async function main(): Promise<void> {
    const successCounts: {[bodyRaw: string]: number} = {};
    let failCount = 0;

    while (!shouldExit) {
        const now = Date.now();
        try {
            const res = await superagent.get(testUrl)
                .query({
                    cacheBust: crypto.randomBytes(20).toString("hex")
                })
                .timeout({
                    response: 15000,
                    deadline: 5000
                });
            if (!successCounts[res.text]) {
                successCounts[res.text] = 0;
            }
            successCounts[res.text]++;
        } catch (err) {
            console.error("\n", err);
            failCount++;
        }

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${Object.keys(successCounts).map(k => `${k}: ${successCounts[k]}`).join(" ")} Fail: ${failCount}`);

        await new Promise(resolve => setTimeout(resolve, 3000 - (Date.now() - now)));
    }
}

main();
