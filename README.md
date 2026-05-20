# Axiom - Personal Prompt Optimizer

Axiom is a powerful and elegant Chrome extension that acts as your personal prompt optimizer. Powered by the Gemini API, Axiom helps you refine and perfect your prompts instantly using customized system instructions directly within your favorite AI chat interfaces.

## 🌟 Key Features

*   **Instant Prompt Optimization**: Seamlessly optimize your prompts inline with a single click.
*   **Customizable Prompt Lengths**: Choose your preferred output length (Short, Medium, or Detailed) to get the prompt exactly how you want it.
*   **Premium Glassmorphism UI**: Enjoy a stunning, modern, and highly responsive user interface featuring glassmorphic design elements.
*   **Low Latency**: Optimized architecture ensuring minimal delay between requesting an optimization and receiving the enhanced prompt.
*   **Universal Compatibility**: Works seamlessly across major AI chat platforms.

## 🌐 Supported Platforms

Axiom currently integrates directly into the following AI interfaces:
*   [Google Gemini](https://gemini.google.com/)
*   [Google AI Studio](https://aistudio.google.com/)
*   [ChatGPT](https://chatgpt.com/)
*   [Claude AI](https://claude.ai/)
*   [DeepSeek](https://deepseek.com/)

## 🛠️ Installation

1.  Clone this repository or download the source code:
    ```bash
    git clone <repository-url>
    ```
2.  Open Google Chrome and navigate to the Extensions page (`chrome://extensions/`).
3.  Enable **Developer mode** using the toggle switch in the top right corner.
4.  Click the **Load unpacked** button.
5.  Select the `Axiom` directory that you just cloned/downloaded.

## 🚀 Usage

1.  **Configure API Key**: Click on the Axiom extension icon in your Chrome toolbar. In the popup, enter your Gemini API key and save it.
2.  **Navigate to an AI Chat**: Open one of the supported platforms (e.g., ChatGPT or Gemini).
3.  **Write your Prompt**: Start typing your prompt in the chat input box.
4.  **Optimize**: Click the Axiom ✨ optimize button that appears near the input box.
5.  **Review and Send**: The prompt will be automatically replaced with an optimized version based on your length preferences.

## ⚙️ Configuration

You can configure Axiom's behavior through the extension popup:
*   **Gemini API Key**: Required for the extension to communicate with the Gemini models.
*   **Prompt Length Preference**: Select how detailed you want the optimized prompts to be (Short, Medium, Detailed).

## 🗂️ File Structure

*   `manifest.json`: The extension's configuration and metadata.
*   `background.js`: Service worker handling background tasks, API calls, and state management.
*   `content.js` / `content.css`: Scripts and styles injected into the supported web pages to provide the inline UI and interaction.
*   `popup/`: Contains the HTML, CSS, and JS for the extension's popup interface.
*   `icons/`: App icons in various sizes.
*   `modules/`: Additional modular scripts or utilities.

## 🛡️ Privacy & Permissions

Axiom requires the following permissions to function:
*   `storage`: To securely save your API key and user preferences locally in your browser.
*   `host_permissions`: To communicate securely with the `generativelanguage.googleapis.com` API endpoints.

Your prompts and API key are never sent to any third-party servers other than the official Google Gemini API for optimization processing.

## 📝 License

[Add License Information Here]
