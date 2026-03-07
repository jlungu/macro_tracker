import puppeteer from "puppeteer";
import sharp from "sharp";
import { mkdir } from "fs/promises";

await mkdir("../public", { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage();

await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 });

await page.setContent(`<!DOCTYPE html>
<html>
<head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 512px; height: 512px;
    background: white;
    display: flex; align-items: center; justify-content: center;
    border-radius: 112px;
    overflow: hidden;
  }
  .emoji { font-size: 320px; line-height: 1; }
</style></head>
<body><div class="emoji">🥕</div></body>
</html>`);

const screenshot = await page.screenshot({ type: "png", omitBackground: false });
await browser.close();

const sizes = [
  { file: "../public/icon-512.png", size: 512 },
  { file: "../public/icon-192.png", size: 192 },
  { file: "../public/apple-touch-icon.png", size: 180 },
  { file: "../public/favicon.png", size: 32 },
];

for (const { file, size } of sizes) {
  await sharp(screenshot).resize(size, size).png().toFile(file);
  console.log(`✓ ${file}`);
}

console.log("Done!");
