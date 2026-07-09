# 📱 Axiom Mobile: iOS Shortcuts & Gemini 3.1 Flash-Lite (Cloudflare Worker Bridge)

This guide walks you through setting up a zero-footprint, screen-aware AI assistant on your iPhone using the native iOS Shortcuts app and a private **Cloudflare Worker** bridge running the hyper-cost-efficient **Gemini 3.1 Flash-Lite** model.

By using the Cloudflare Worker bridge, we offload all complex JSON payloads, headers, prompts, and key-path parsing from your phone. Your iOS Shortcuts will shrink down to just **3 simple blocks**.

---

## 🛠️ Step 1: Deploy Your Private Cloudflare Worker Bridge

You can deploy the worker in 2 minutes using your Mac terminal:

### 1. Navigate to the bridge directory:
```bash
cd mobile-bridge
```

### 2. Log in to Cloudflare (Free Account):
If you do not have a Cloudflare account, this command will guide you to create one:
```bash
npx wrangler login
```

### 3. Add your Gemini API Key securely:
Enter your Gemini API key (from Google AI Studio) when prompted:
```bash
npx wrangler secret put GEMINI_API_KEY
```

### 4. Deploy to the Cloud:
```bash
npx wrangler deploy
```

Once successful, copy the deployment URL from the terminal output (e.g., `https://axiom-mobile-bridge.[your-username].workers.dev`).

---

## 📱 Step 2: Build the iOS Shortcuts

Create two shortcuts in the **Shortcuts app** on your iPhone:

### Shortcut A: `✨ Optimize Prompt` (Only 3 Blocks!)
This shortcut optimizes any prompt draft copied to your clipboard.

1. **Get Clipboard**
2. **Get contents of URL:**
   * URL: `https://[your-worker-url].workers.dev/optimize?text=[Clipboard]`
   * Method: **GET**
3. **Copy to Clipboard**

---

### Shortcut B: `💬 Draft a Reply` (Only 3 Blocks!)
This shortcut reads your active screen (e.g. WhatsApp chat bubbles) and copies a drafted reply.

1. **Take Screenshot** -> Pass to **Extract Text from Image** *(Note: Pass the screenshot directly to OCR so iOS discards it in-memory without saving it to Photos)*.
2. **Get contents of URL:**
   * URL: `https://[your-worker-url].workers.dev/reply`
   * Method: **POST**
   * Request Body: **File** -> Select the **Extracted Text** output variable.
3. **Copy to Clipboard**

---

## 🚀 Step 3: Map the Shortcut to Back Tap

To bind your new Shortcut to a physical tap:
1. Open the **Settings** app on your iPhone.
2. Navigate to **Accessibility** -> **Touch**.
3. Scroll to the bottom and select **Back Tap**.
4. Choose **Double Tap** (or **Triple Tap**).
5. Scroll down to the **Shortcuts** category and select **Axiom Mobile**.

Now, double-tapping the back of your phone will immediately open the menu to either optimize your copied prompt or automatically read your chat screen to generate a reply!
