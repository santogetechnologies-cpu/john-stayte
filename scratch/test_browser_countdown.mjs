import { spawn } from "node:child_process";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const EDGE_PATH = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
const USER_DATA_DIR = `/tmp/edge-countdown-real-${Date.now()}`;
const DEBUG_PORT = 9227;
const BASE_URL = "http://localhost:8080";
const ARTIFACT_DIR = "/Users/ashlinjeshma/.gemini/antigravity/brain/b9f24c78-bece-4658-8d3f-0b1ef9f7d476";

const sb = createClient(
  "https://wttchknauwvbfjatdscc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dGNoa25hdXd2YmZqYXRkc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mjk1NTQsImV4cCI6MjEwMjAwNTU1NH0.z6nXs0zC8u7A_CUO8KDIoILSXS_OeMPrr5OdVYcmxQE"
);
const sbAdmin = createClient(
  "https://wttchknauwvbfjatdscc.supabase.co",
  "sb_secret_ZwtR_A-zCLMJfCqNkqNbEw_Fa9r_c5x"
);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
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
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method && this.eventListeners.has(msg.method)) {
        for (const handler of this.eventListeners.get(msg.method)) {
          handler(msg.params);
        }
      }
    };
  }

  send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || "Evaluation error");
    }
    return res.result?.value;
  }

  async captureScreenshot(filepath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(filepath, buffer);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runTest() {
  console.log("=== 1. Generating Real Auth Session for ashlytwinky03@gmail.com ===");
  const { data: linkData, error: linkErr } = await sbAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: "ashlytwinky03@gmail.com",
  });
  if (linkErr) throw linkErr;

  const { data: sessionData, error: sessionErr } = await sb.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (sessionErr) throw sessionErr;

  const realSession = sessionData.session;
  console.log("Real session authenticated for:", realSession.user.email);

  console.log("=== 2. Launching Headless Microsoft Edge ===");
  const edgeProcess = spawn(EDGE_PATH, [
    "--headless=new",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--window-size=1280,1000",
    "--disable-gpu",
    "--no-first-run",
    "about:blank",
  ]);

  let wsDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const resp = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      const data = await resp.json();
      if (data.webSocketDebuggerUrl) {
        wsDebuggerUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsDebuggerUrl) {
    edgeProcess.kill();
    throw new Error("Could not connect to Edge CDP.");
  }

  const newTabResp = await fetch(
    `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" }
  );
  const tabData = await newTabResp.json();
  const pageWsUrl = tabData.webSocketDebuggerUrl;

  const client = new CDPClient(pageWsUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  client.on("Runtime.consoleAPICalled", (params) => {
    const text = params.args?.map(a => a.value || a.description).join(" ");
    console.log(`[BROWSER CONSOLE ${params.type}]:`, text);
  });
  client.on("Runtime.exceptionThrown", (params) => {
    console.log(`[BROWSER EXCEPTION]:`, params.exceptionDetails?.text, params.exceptionDetails?.exception?.description);
  });

  try {
    // 1. Navigate to base domain first to set localStorage
    console.log("3. Setting Supabase Auth Session in LocalStorage...");
    await client.send("Page.navigate", { url: `${BASE_URL}/login` });
    await sleep(1500);

    await client.evaluate(`
      localStorage.setItem("sb-wttchknauwvbfjatdscc-auth-token", JSON.stringify(${JSON.stringify(realSession)}));
    `);

    // 2. Navigate to /branch/orders
    console.log("4. Navigating to /branch/orders as ashly (Gloucester staff)...");
    await client.send("Page.navigate", { url: `${BASE_URL}/branch/orders` });
    await sleep(3500);

    const ordersInfo = await client.evaluate(`
      (() => {
        const title = document.title;
        const bodyText = document.body.innerText;
        const buttons = Array.from(document.querySelectorAll("button"));
        const handoverBtns = buttons.filter(b => b.innerText.includes("Handover Customer"));
        return {
          title,
          hasGloucester: bodyText.includes("Gloucester"),
          hasBranchOrders: bodyText.includes("Branch Orders"),
          handoverButtonsCount: handoverBtns.length,
          handoverTexts: handoverBtns.map(b => b.innerText),
        };
      })()
    `);
    console.log("Orders page status:", ordersInfo);

    if (ordersInfo.handoverButtonsCount === 0) {
      console.log("Taking screenshot of orders page...");
      await client.captureScreenshot(`${ARTIFACT_DIR}/branch-orders-no-handover.png`);
      throw new Error("No Handover Customer button rendered for Gloucester staff.");
    }

    // 3. Click the Handover Customer button
    console.log("5. Clicking 'Handover Customer' button...");
    await client.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find(b => b.innerText.includes("Handover Customer"));
        if (btn) btn.click();
      })()
    `);

    // 4. Sample the modal every 1 second for 8 seconds
    console.log("6. Observing modal state and live countdown progression...");
    const samples = [];
    for (let s = 1; s <= 8; s++) {
      await sleep(1000);
      const state = await client.evaluate(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return { dialogOpen: false };
          
          const buttons = Array.from(dialog.querySelectorAll("button"));
          const resendBtn = buttons.find(b => b.innerText.includes("Resend OTP") || b.innerText.includes("Sending OTP"));
          const verifyBtn = buttons.find(b => b.innerText.includes("Verify OTP"));
          const confirmBtn = buttons.find(b => b.innerText.includes("Confirm & Complete"));
          
          let sessionStorageCooldown = null;
          try {
            for (let i = 0; i < sessionStorage.length; i++) {
              const k = sessionStorage.key(i);
              if (k.startsWith("jss_branch_otp_cooldown_")) {
                sessionStorageCooldown = { key: k, val: sessionStorage.getItem(k) };
              }
            }
          } catch (e) {}

          return {
            dialogOpen: true,
            resendBtnText: resendBtn ? resendBtn.innerText.trim() : null,
            resendBtnDisabled: resendBtn ? resendBtn.disabled : null,
            verifyBtnDisabled: verifyBtn ? verifyBtn.disabled : null,
            confirmBtnDisabled: confirmBtn ? confirmBtn.disabled : null,
            sessionStorageCooldown,
          };
        })()
      `);

      console.log(
        `[Second ${s}] Button Text: "${state.resendBtnText}", Disabled: ${state.resendBtnDisabled}, Storage:`,
        state.sessionStorageCooldown
      );
      samples.push(state);

      if (s === 2 || s === 4 || s === 6) {
        console.log(`Capturing screenshot at second ${s}...`);
        await client.captureScreenshot(`${ARTIFACT_DIR}/handover-countdown-second-${s}.png`);
      }
    }

    console.log("\n=== 7. Testing Modal Reopening / SessionStorage Persistence ===");
    // Close modal
    await client.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Cancel");
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(1000);

    // Reopen modal
    console.log("Reopening Handover modal...");
    await client.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Handover Customer"));
        if (btn) btn.click();
      })()
    `);
    await sleep(500);

    const reopenedState = await client.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const resendBtn = Array.from(dialog?.querySelectorAll("button") || []).find(b => b.innerText.includes("Resend OTP") || b.innerText.includes("Sending OTP"));
        return {
          resendBtnText: resendBtn?.innerText?.trim(),
          resendBtnDisabled: resendBtn?.disabled
        };
      })()
    `);
    console.log("Immediately after reopening modal:", reopenedState);
    await client.captureScreenshot(`${ARTIFACT_DIR}/handover-countdown-reopened-modal.png`);

    console.log("\n=== 8. Testing Subsequent Resend Action After Cooldown Expiry ===");
    // Fast forward cooldown to expire in 2 seconds
    await client.evaluate(`
      (() => {
        const nearExpiry = Date.now() + 2000;
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k.startsWith("jss_branch_otp_cooldown_")) {
            sessionStorage.setItem(k, String(nearExpiry));
          }
        }
      })()
    `);
    // Reopen to sync state or wait
    await client.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Cancel");
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(500);
    await client.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Handover Customer"));
        if (btn) btn.click();
      })()
    `);
    await sleep(2500); // Cooldown has reached 0

    const expiredState = await client.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const resendBtn = Array.from(dialog?.querySelectorAll("button") || []).find(b => b.innerText.includes("Resend OTP"));
        return {
          resendBtnText: resendBtn?.innerText?.trim(),
          resendBtnDisabled: resendBtn?.disabled
        };
      })()
    `);
    console.log("State when countdown reaches zero:", expiredState);

    // Click Resend OTP
    console.log("Clicking 'Resend OTP' button...");
    await client.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const resendBtn = Array.from(dialog?.querySelectorAll("button") || []).find(b => b.innerText.trim() === "Resend OTP");
        if (resendBtn) resendBtn.click();
      })()
    `);

    await sleep(1000);
    const duringResend = await client.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const resendBtn = Array.from(dialog?.querySelectorAll("button") || []).find(b => b.innerText.includes("Resend OTP") || b.innerText.includes("Sending OTP"));
        return {
          resendBtnText: resendBtn?.innerText?.trim(),
          resendBtnDisabled: resendBtn?.disabled
        };
      })()
    `);
    console.log("During resend in flight:", duringResend);

    // Wait for resend to complete and cooldown to restart
    await sleep(3500);
    const afterResend = await client.evaluate(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const resendBtn = Array.from(dialog?.querySelectorAll("button") || []).find(b => b.innerText.includes("Resend OTP"));
        return {
          resendBtnText: resendBtn?.innerText?.trim(),
          resendBtnDisabled: resendBtn?.disabled
        };
      })()
    `);
    console.log("After resend success (new countdown):", afterResend);
    await client.captureScreenshot(`${ARTIFACT_DIR}/handover-countdown-after-resend.png`);

    console.log("\n=== 9. Verification Complete ===");

  } finally {
    client.close();
    edgeProcess.kill();
  }
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
