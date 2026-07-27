
#!/usr/bin/env node
// اسکریپت برای به‌روزرسانی نسخه در فایل‌های مختلف
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Usage: bump-version.js <new-version>');
  process.exit(1);
}

pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`✅ Version bumped to ${newVersion}`);