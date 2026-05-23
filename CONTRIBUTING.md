# Contributing to Axiom & AxiomOS

First off, thank you for considering contributing to Axiom! Contributions are what make the open-source community such an amazing place to learn, inspire, and create. 

This document outlines a set of guidelines and best practices for contributing to the Axiom browser extension and the AxiomOS macOS desktop companion. Following these guidelines helps us process your pull requests quickly and keep the codebase clean, stable, and maintainable.

---

## 🗺️ Codebase Map & Tech Stack

Before diving in, take a moment to understand the technical constraints of both parts of the repository:

1.  **Axiom Chrome Extension:**
    *   *Stack:* Vanilla HTML5, CSS3, and modern ES6 JavaScript.
    *   *Constraints:* **Strictly zero external npm dependencies or bundlers.** All scripts are standard ECMAScript Modules (`type: "module"`) injected or executed natively by Chrome. This ensures lightning-fast execution, easy security audits, and zero dependency vulnerabilities.
    *   *Web API:* Integrates directly with browser-native APIs (`chrome.storage`, `chrome.runtime`, `TextDecoderStream`, and the experimental `window.ai` language model API).

2.  **AxiomOS macOS App:**
    *   *Stack:* Swift 5.9+, SwiftUI, Cocoa, Carbon, ApplicationServices.
    *   *Constraints:* Targets macOS 13.0+ (Ventura). Runs as a background accessory (`LSUIElement` / `.accessory` activation policy).
    *   *Low-Level Hooks:* Interacts directly with Carbon Core events for low-latency global keyboard hooks, and utilizes macOS Accessibility APIs (`AXUIElement`) to query/inject text selection across process boundaries.

---

## 🛠️ Local Development Setup

### Extension Workspace Setup
1.  Open Google Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** using the toggle in the upper-right corner.
3.  Click **Load unpacked** and select the root directory of this repository.
4.  To inspect changes:
    *   *Content Scripts:* Inspect the target LLM chat tab's DevTools console.
    *   *Service Worker:* Click the `service worker` link next to "Inspect views" on the extension's entry card in `chrome://extensions/`.
    *   *Popup/Options:* Right-click the popup or options page and select **Inspect**.

### macOS App Workspace Setup
1.  Install Xcode or the Xcode Command Line Tools:
    ```bash
    xcode-select --install
    ```
2.  Navigate to the desktop application workspace:
    ```bash
    cd AxiomOS
    ```
3.  Build the Swift package in debug mode for testing:
    ```bash
    swift build
    ```
4.  Run the application in the background:
    ```bash
    swift run
    ```
5.  *Diagnostic Tip:* To inspect system accessibility events or confirm accessibility permissions are active, look at your Terminal logs:
    ```
    [AxiomOS Config] Successfully loaded config from ~/.axiom_config.json
    [AxiomOS HotKey] Native Carbon global hotkey hooks established successfully!
    ```

---

## 🎨 Code Style Guidelines

To keep the codebase maintainable, we enforce consistent design patterns and styling.

### 💛 JavaScript Styles (Chrome Extension)
*   **ES6 Modules:** Always organize reusable functions under explicit exports in standard ECMAScript modules (e.g., inside [modules/](file:///Users/sreeramlagisetty/Desktop/Axiom/modules)).
*   **Asynchronous Flow:** Prefer `async/await` syntax over raw Promise chaining (`.then().catch()`) for readability.
*   **DOM Injection & Safety:**
    *   Never use `innerHTML` to inject unescaped text from external prompt APIs. This prevents Cross-Site Scripting (XSS) risks.
    *   Use `document.createElement`, `element.textContent`, or `element.classList` to construct modern UI nodes dynamically.
*   **Clean Up Event Listeners:** Always clean up timers, MutationObservers, and document event listeners. In the content script, ensure that if the extension context is invalidated (e.g., during an extension update), all side effects are destroyed via the `destroyAxiom()` lifecycle method.

### 💙 Swift & SwiftUI Styles (AxiomOS)
*   **Concurrency:** Use modern Swift concurrency (`async/await` and `Task`) instead of legacy Grand Central Dispatch (`dispatch_async`) for long-running network or AX capturing events.
*   **Memory Management:** Always use `[weak self]` in event callbacks, notification observers, or async task escapes inside AppDelegate/HUD controllers to prevent memory leaks or retain cycles.
*   **Accessibility Interop:**
    *   Ensure all low-level `AXUIElement` properties are accessed on helper worker tasks to avoid blocking the main AppKit thread.
    *   Always verify processes are trusted (`AXIsProcessTrusted()`) before attempting to simulate CGEvents or querying active windows.
*   **SwiftUI Views:** Keep SwiftUI views modular. Break down complex overlay frames (like [HUDView.swift](file:///Users/sreeramlagisetty/Desktop/Axiom/AxiomOS/Sources/AxiomOS/UI/HUDView.swift)) into computed sub-views (e.g. `headerView`, `actionsListView`, `streamingView`) to maintain high-quality compile speeds.

---

## 📈 Git Commit Standards

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit history. This allows us to generate clean, readable release logs automatically.

Format your commit messages as:
```
<type>(<scope>): <short descriptive summary>

[optional body describing technical rationale, design decisions, or breaking changes]

[optional footer referencing issue IDs: Closes #123]
```

### Commit Types:
*   `feat`: A new feature (e.g., adding a new LLM platform selector to content.js).
*   `fix`: A bug fix (e.g., correcting accessibility text replacement offsets).
*   `docs`: Documentation changes only.
*   `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons).
*   `refactor`: A code change that neither fixes a bug nor adds a feature.
*   `perf`: A code change that improves performance (e.g., optimizing DOM mutation observer triggers).
*   `test`: Adding missing tests or correcting existing tests.

---

## 🚀 Pull Request Pipeline

When submitting a Pull Request, please follow this checklist:

1.  **Branch Naming:** Create a feature branch off of `main` named `feature/your-feature-name` or `bugfix/issue-description`.
2.  **No Extraneous Files:** Verify your branch does not check in temporary OS files (such as `.DS_Store`), private configurations (`~/.axiom_config.json`), or local Swift build directories. Double check your `.gitignore` compliance.
3.  **Cross-Platform Verification:** If modifying a shared persona mode or communication API layer, test that changes integrate correctly across *both* the Chrome Extension and the macOS `AxiomOS` app.
4.  **Describe Your Rationale:** In the PR description, explain:
    *   *What:* The exact problem you are solving.
    *   *Why:* The reasoning behind your technical approach.
    *   *Testing:* Screenshots, console outputs, or build summaries proving the changes work.
5.  **Review Loop:** Maintain an open line of communication. All PRs must receive at least one maintainer review before merging.

Thank you again for contributing! We appreciate your support in making Axiom a premium, high-fidelity experience.
