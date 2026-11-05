import { spawn } from "node:child_process";
import fs from "node:fs";

const EDGE_PATH = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
const USER_DATA_DIR = `/tmp/edge-website-trust-${Date.now()}`;
const DEBUG_PORT = 9228;
const BASE_URL = "http://localhost:8080";
const ARTIFACT_DIR = "/Users/ashlinjeshma/.gemini/antigravity/brain/b9f24c78-bece-4658-8d3f-0b1ef9f7d476";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url) {
    await this.send("Page.navigate", { url });
    await sleep(2500);
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async captureScreenshot(filepath) {
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(filepath, Buffer.from(res.data, "base64"));
    console.log(`Saved screenshot: ${filepath}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log("Launching Edge headless...");
  const edgeProcess = spawn(
    EDGE_PATH,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(1500);

  try {
    const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
    const pages = await listRes.json();
    const pageTarget = pages.find((p) => p.type === "page") || pages[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("DOM.enable");

    // 1. Home Page + Cookie Consent Banner
    console.log("Navigating to Home...");
    await client.navigate(`${BASE_URL}/`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-home-cookie-banner.png`);

    // Scroll to footer
    await client.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-footer-and-legal.png`);

    // 2. Cookie Settings Dialog
    console.log("Opening Cookie Settings modal...");
    await client.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Customise Settings") || b.innerText.includes("Cookie Settings"));
        if (btn) btn.click();
      })()
    `);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-cookie-settings-dialog.png`);

    // 3. FAQ Page
    console.log("Navigating to FAQ...");
    await client.navigate(`${BASE_URL}/faq`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-faq-page.png`);

    // 4. Privacy Policy Page
    console.log("Navigating to Privacy Policy...");
    await client.navigate(`${BASE_URL}/privacy-policy`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-privacy-policy.png`);

    // 5. Terms of Sale Page
    console.log("Navigating to Terms...");
    await client.navigate(`${BASE_URL}/terms`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-terms-conditions.png`);

    // 6. Refund Policy Page
    console.log("Navigating to Refund Policy...");
    await client.navigate(`${BASE_URL}/refund-policy`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-refund-policy.png`);

    // 7. Contact Page
    console.log("Navigating to Contact...");
    await client.navigate(`${BASE_URL}/contact`);
    await sleep(1000);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-contact-page.png`);

    console.log("All screenshots captured successfully!");
    client.close();
  } finally {
    edgeProcess.kill();
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
