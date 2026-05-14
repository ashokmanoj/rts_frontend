/**
 * scripts/generate-login-guide-pdf.cjs
 * Run: node scripts/generate-login-guide-pdf.cjs
 * Requires: npm install puppeteer --save-dev   (run once)
 */

const puppeteer = require("puppeteer");
const path      = require("path");
const fs        = require("fs");

async function main() {
  const htmlPath = path.resolve(__dirname, "../src/guides/RTS-Login-Guide.html");
  const outPath  = path.resolve(__dirname, "../public/RTS-Login-Guide.pdf");

  if (!fs.existsSync(htmlPath)) {
    console.error("❌ Source HTML not found:", htmlPath);
    process.exit(1);
  }

  console.log("🚀 Launching browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page    = await browser.newPage();

  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  console.log("📄 Loading:", fileUrl);
  await page.goto(fileUrl, { waitUntil: "networkidle0" });

  console.log("🖨  Generating PDF...");
  await page.pdf({
    path:           outPath,
    format:         "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });

  await browser.close();
  console.log("✅ PDF saved to:", outPath);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
