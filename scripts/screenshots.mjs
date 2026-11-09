// Renders the store/README screenshots (1280×800) in English and Spanish into
// docs/screenshots/. The pages run outside Firefox, so the WebExtension APIs
// they use (i18n, runtime messages) are stubbed with sample data.
//
// Usage: npm run screenshots
//        CHROMIUM_PATH=/path/to/chrome npm run screenshots
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pages = `${root}extension/pages/`;
const out = `${root}docs/screenshots/`;
const sample = { enabled: true, blocked: 4, vpnSeenAt: Date.now() - 12000, privateAllowed: true, showCount: true };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function open(lang, file, viewport, dark = false) {
  const messages = JSON.parse(readFileSync(`${root}extension/_locales/${lang}/messages.json`, "utf8"));
  const page = await browser.newPage({ viewport, colorScheme: dark ? "dark" : "light" });
  await page.addInitScript(([messages, lang, state]) => {
    const getMessage = (key, subs = []) => {
      const entry = messages[key];
      if (!entry) return "";
      let text = entry.message;
      for (const [name, ph] of Object.entries(entry.placeholders || {})) {
        const value = ph.content.replace(/\$(\d)/g, (_, i) => subs[i - 1] ?? "");
        text = text.replaceAll(`$${name.toUpperCase()}$`, value);
      }
      return text;
    };
    window.browser = {
      i18n: { getMessage, getUILanguage: () => lang },
      runtime: {
        sendMessage: async (m) => (m.type === "get" ? state : {}),
        getPlatformInfo: async () => ({ os: "mac" }),
      },
    };
  }, [messages, lang, sample]);
  await page.goto(`file://${pages}${file}`);
  await page.waitForTimeout(300);
  return page;
}

for (const lang of ["en", "es"]) {
  const popup = await open(lang, "popup.html", { width: 320, height: 160 });
  const popupPng = await popup.screenshot({ fullPage: true });
  const stage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await stage.setContent(`<body style="margin:0;height:100vh;display:grid;place-items:center;background:#ebe7f5">
    <img style="width:640px;border-radius:16px;box-shadow:0 24px 60px rgba(34,26,51,.25)"
         src="data:image/png;base64,${popupPng.toString("base64")}"></body>`);
  await stage.screenshot({ path: `${out}popup-${lang}.png` });

  const blocked = await open(lang, "blocked.html?u=https%3A%2F%2Fexample.com%2F", { width: 1280, height: 800 });
  await blocked.screenshot({ path: `${out}blocked-${lang}.png` });

  const welcome = await open(lang, "welcome.html", { width: 1280, height: 800 }, true);
  await welcome.screenshot({ path: `${out}welcome-${lang}.png` });
}
await browser.close();
