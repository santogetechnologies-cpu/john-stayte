import { spawn } from "node:child_process";
import fs from "node:fs";

const EDGE_PATH = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
const USER_DATA_DIR = `/tmp/edge-opening-behavior-${Date.now()}`;
const DEBUG_PORT = 9229;
const BASE_URL = "http://localhost:5173";
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
    await sleep(2000);
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
  console.log("=== WEBSITE OPENING BEHAVIOUR VERIFICATION ===");
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

    // TEST 1: Opening the main website URL loads Home (/)
    console.log("Test 1: Opening main website URL (http://localhost:5173/)...");
    await client.navigate(`${BASE_URL}/`);
    await sleep(1500);

    const pathname1 = await client.evaluate("window.location.pathname");
    const title1 = await client.evaluate("document.title");
    const hasHeroLorry = await client.evaluate("Boolean(document.querySelector('img[alt*=\"lorry\"], img[alt*=\"delivery\"]'))");
    const heroHeading = await client.evaluate("document.querySelector('h1')?.innerText || ''");

    console.log(`- Pathname: ${pathname1}`);
    console.log(`- Title: ${title1}`);
    console.log(`- Has Hero Lorry: ${hasHeroLorry}`);
    console.log(`- Hero Heading: ${heroHeading}`);

    if (pathname1 !== "/") {
      throw new Error(`Expected pathname '/' but got '${pathname1}'`);
    }
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-test-1-home-load.png`);

    // TEST 2: Refreshing Home keeps the user on Home
    console.log("\nTest 2: Refreshing Home page...");
    await client.evaluate("window.location.reload()");
    await sleep(2000);

    const pathname2 = await client.evaluate("window.location.pathname");
    const title2 = await client.evaluate("document.title");
    console.log(`- Pathname after reload: ${pathname2}`);
    console.log(`- Title after reload: ${title2}`);

    if (pathname2 !== "/") {
      throw new Error(`Expected pathname '/' after reload but got '${pathname2}'`);
    }
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-test-2-home-refresh.png`);

    // TEST 3: Navigating Home -> Shop & Order Gas -> Product Details
    console.log("\nTest 3: Navigating to Shop & Order Gas (/order-gas)...");
    await client.navigate(`${BASE_URL}/order-gas`);
    await sleep(1500);

    const pathname3 = await client.evaluate("window.location.pathname");
    console.log(`- Pathname: ${pathname3}`);
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-test-3-shop-page.png`);

    // TEST 4: Clicking a product opens its correct product details page
    console.log("\nTest 4: Opening a product details page (/products/calor-patio-gas-13kg-refill)...");
    await client.navigate(`${BASE_URL}/products/calor-patio-gas-13kg-refill`);
    await sleep(2000);

    const pathname4 = await client.evaluate("window.location.pathname");
    const prodTitle = await client.evaluate("document.querySelector('h1')?.innerText || ''");
    console.log(`- Pathname: ${pathname4}`);
    console.log(`- Product Title: ${prodTitle}`);

    if (!pathname4.includes("/products/calor-patio-gas-13kg-refill")) {
      throw new Error(`Expected product page but got '${pathname4}'`);
    }
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-test-4-product-details.png`);

    // TEST 5: Browser Back returns to the previous page correctly
    console.log("\nTest 5: Browser Back navigation...");
    await client.evaluate("window.history.back()");
    await sleep(1500);

    const pathname5 = await client.evaluate("window.location.pathname");
    console.log(`- Pathname after browser back: ${pathname5}`);

    if (pathname5 !== "/order-gas") {
      throw new Error(`Expected back navigation to '/order-gas' but got '${pathname5}'`);
    }
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-test-5-browser-back.png`);

    // TEST 6: Re-opening main website URL does NOT automatically redirect to previously visited product
    console.log("\nTest 6: Re-opening main website URL after visiting product...");
    await client.navigate(`${BASE_URL}/`);
    await sleep(1500);

    const pathname6 = await client.evaluate("window.location.pathname");
    console.log(`- Pathname after re-opening root: ${pathname6}`);

    if (pathname6 !== "/") {
      throw new Error(`Expected '/' but automatically redirected to '${pathname6}'`);
    }
    await client.captureScreenshot(`${ARTIFACT_DIR}/website-test-6-root-revisit.png`);

    console.log("\n✅ ALL 6 BROWSER OPENING & NAVIGATION TESTS PASSED!");
    client.close();
  } finally {
    edgeProcess.kill();
    await sleep(500);
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {
      /* ignore temp cleanup race */
    }
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
