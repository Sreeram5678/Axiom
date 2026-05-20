# Chrome Web Store Listing — Axiom

> Last Updated: 2026-05-20

## Store Listing

**Extension Name**
Axiom — Personal Prompt Optimizer

**Short Description**
Refine and optimize raw prompts instantly using the Gemini API and customizable expert personas in a sleek dark-mode popup.

**Detailed Description**
Axiom is a lightweight, high-performance developer tool that transforms raw, basic user inputs into highly optimized, high-fidelity prompts for large language models. Running on Manifest V3, Axiom leverages the power of the Gemini API to upgrade your AI prompts in seconds.

Simply type a raw prompt, select your preferred Mode (Analyst, Engineer, First-Principles, or Exec-Summary), and click Optimize. Axiom injects tailored prompt engineering instructions to rewrite and expand your prompt, delivering clean plain text ready to be copied and pasted.

Key Features:
- Four expert default modes (Analyst, Engineer, First-Principles, Exec-Summary).
- Inline Prompt Optimizer: A beautiful "✨ Optimize Prompt" capsule button is injected directly above search/ask fields on Google Gemini, ChatGPT, Claude, Google AI Studio, and DeepSeek. It optimizes and replaces prompts in-place instantly!
- Fully customizable Modes system (edit and validate your prompt configurations as raw JSON blocks directly in Settings).
- Sleek dark-mode glassmorphic user interface.
- Secure local storage for API keys and configurations.
- Background execution: prompt optimizations complete successfully even if you close the extension popup.

How to Use:
1. Obtain a free Gemini Developer API Key from Google AI Studio.
2. Open Axiom's Settings tab, paste the key, and click Save.
3. Select your model (defaulting to the highly efficient Gemini 3.1 Flash-Lite).
4. EITHER: Open the extension popup, type a prompt, choose a Mode, click Optimize, and Copy it.
5. OR: Go to ChatGPT, Claude, Gemini, Google AI Studio, or DeepSeek, type a prompt inside the input box, and click the beautiful "✨ Optimize Prompt" pill button that appears right above it! It will instantly optimize and replace your prompt in-place.

Privacy and Permissions:
Axiom values your privacy. Your API key, custom configurations, and history never leave your machine and are stored strictly on-device in secure extension storage. All API requests are made directly from your browser to Google's official Gemini endpoints. No telemetry, analytics, or third-party trackers are included.

**Category**
Developer Tools

**Single Purpose**
Transforms raw user prompts into highly optimized, high-fidelity AI instructions using the Gemini API based on selectable personas, either via popup or directly inline inside AI chats.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |

---

## Permissions Justification

Every permission used in Axiom is strictly scoped to support the primary prompt engineering function:

| Permission / File | Type | Justification |
|-------------------|------|---------------|
| `storage` | permissions | Used to persist the user's secure Gemini API key, model selection, prompt engineering modes, and typed input state so configurations remain saved across browser restarts. |
| `https://generativelanguage.googleapis.com/*` | host_permissions | Used to send HTTP POST requests directly to Google's official Gemini API endpoint to retrieve the optimized prompt text. Scoped precisely to the Gemini API domain. |
| `content_scripts` | injection | Injects `content.js` and `content.css` strictly onto Google Gemini, Google AI Studio, ChatGPT, Claude, and DeepSeek domains to display the sleek "✨ Optimize Prompt" inline button and replace input texts in-place. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

All prompt processing is performed directly via API calls to Google's endpoints. No user data, passwords, or personal communications are collected, logged, or shared with the developer or any third party.

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-05-20 | Initial production-grade release of Axiom featuring tabbed layout, custom JSON Mode editor, background service worker request persistence, and Gemini 3.1 Flash-Lite support. | Draft |
