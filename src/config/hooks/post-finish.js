// هوک بعد از پایان شاخه
const { execSync } = require("child_process");

console.log("✅ Branch finished!");
console.log("🚀 Triggering deployment pipeline...");

// می‌تواند یک API call یا اسکریپت دیگر باشد
execSync("curl -X POST https://api.example.com/deploy", { stdio: "inherit" });
