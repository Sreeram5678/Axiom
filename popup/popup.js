import { getModes, saveModes, resetModes } from '../modules/modes.js';

// DOM Elements
const tabOptimizeBtn = document.getElementById('tab-optimize-btn');
const tabSettingsBtn = document.getElementById('tab-settings-btn');
const optimizePanel = document.getElementById('optimize-panel');
const settingsPanel = document.getElementById('settings-panel');

const apiAlertBanner = document.getElementById('api-alert-banner');
const rawPromptInput = document.getElementById('raw-prompt-input');
const charCountLabel = document.getElementById('char-count');
const modeSelect = document.getElementById('mode-select');
const lengthBtns = document.querySelectorAll('.length-btn');
const optimizeCtaBtn = document.getElementById('optimize-cta-btn');

const outputSection = document.getElementById('output-section');
const optimizedPromptOutput = document.getElementById('optimized-prompt-output');
const copyBtn = document.getElementById('copy-btn');
const copyToast = document.getElementById('copy-toast');
const openOptionsBtn = document.getElementById('open-options-btn');


const modelSelect = document.getElementById('model-select');
const defaultLengthSelect = document.getElementById('default-length-select');
const jsonModesEditor = document.getElementById('json-modes-editor');
const jsonErrorStatus = document.getElementById('json-error-status');
const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// State variables
let currentModes = [];
let selectedLength = 'medium';

// DOMContentLoaded Entry point
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial setups
  await initializeUI();

  // 2. Event Listeners
  setupTabSwitching();
  setupEventListeners();

  // 3. Check for any in-progress background optimization
  await checkSessionState();
});

// UI Initialization
async function initializeUI() {
  try {
    // Load API Key, Model settings, prompt length & last selected Mode
    const { apiKey = '', selectedModel = 'gemini-3.1-flash-lite', savedInput = '', lastActiveModeId = 'analyst', selectedLength = '', defaultLength = 'medium' } = await chrome.storage.local.get(['apiKey', 'selectedModel', 'savedInput', 'lastActiveModeId', 'selectedLength', 'defaultLength']);
    
    modelSelect.value = selectedModel;
    defaultLengthSelect.value = defaultLength;
    rawPromptInput.value = savedInput;
    updateCharCounter(savedInput);
    
    // Set selected prompt length and update UI (falls back to defaultLength if no active selection is saved)
    const activeLength = selectedLength || defaultLength;
    updateSelectedLengthUI(activeLength);

    // Toggle API alert banner based on API key availability
    toggleApiAlertBanner(apiKey);

    // Render optimization modes select and settings JSON editor
    await renderModes();
  } catch (err) {
    console.warn("[Axiom Popup] Context invalidated or error during UI initialization:", err.message);
  }
}

// Render Select Dropdown and JSON editor
async function renderModes() {
  try {
    currentModes = await getModes();
    
    // Populate the Dropdown
    modeSelect.innerHTML = '';
    currentModes.forEach(mode => {
      const option = document.createElement('option');
      option.value = mode.id;
      option.textContent = `${mode.name} — ${mode.description}`;
      modeSelect.appendChild(option);
    });

    // Set selected dropdown value to last active mode
    const { lastActiveModeId = 'analyst' } = await chrome.storage.local.get(['lastActiveModeId']);
    if (currentModes.some(m => m.id === lastActiveModeId)) {
      modeSelect.value = lastActiveModeId;
    }

    // Populate raw JSON editor in Settings
    jsonModesEditor.value = JSON.stringify(currentModes, null, 2);
  } catch (err) {
    console.warn("[Axiom Popup] Context invalidated or error during renderModes:", err.message);
  }
}

// Check if background service worker is currently running an optimization
async function checkSessionState() {
  if (!chrome.storage.session) return;
  
  try {
    const sessionData = await chrome.storage.session.get(['status', 'rawPrompt', 'selectedModeId', 'selectedLength', 'optimizedPrompt', 'error']);
    
    if (sessionData.status) {
      handleBackgroundState(sessionData);
    }
  } catch (err) {
    console.warn("[Axiom Popup] Context invalidated or error checking session state:", err.message);
  }
}

// Handle current background state
function handleBackgroundState(state) {
  if (state.status === 'thinking') {
    // Show spinner & disable controls
    setLoadingState(true);
    // Restore inputs if they match the background run
    rawPromptInput.value = state.rawPrompt || '';
    modeSelect.value = state.selectedModeId || '';
    if (state.selectedLength) {
      updateSelectedLengthUI(state.selectedLength);
    }
  } else if (state.status === 'success') {
    setLoadingState(false);
    showOutput(state.optimizedPrompt);
    if (state.selectedLength) {
      updateSelectedLengthUI(state.selectedLength);
    }
  } else if (state.status === 'error') {
    setLoadingState(false);
    showError(state.error);
    if (state.selectedLength) {
      updateSelectedLengthUI(state.selectedLength);
    }
  }
}

// Listen to storage session updates (polling-free reactivity)
try {
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      try {
        if (area === 'session') {
          const sessionUpdate = {};
          let hasUpdate = false;
          
          for (const [key, { newValue }] of Object.entries(changes)) {
            sessionUpdate[key] = newValue;
            hasUpdate = true;
          }
          
          if (hasUpdate) {
            // Fetch complete session state to keep variables aligned
            chrome.storage.session.get(null, (fullSession) => {
              try {
                if (chrome.runtime.lastError) {
                  console.warn("[Axiom Popup] Session storage read error during change event:", chrome.runtime.lastError.message);
                  return;
                }
                handleBackgroundState(fullSession);
              } catch (innerErr) {
                console.warn("[Axiom Popup] Error inside session get callback:", innerErr.message);
              }
            });
          }
        }
      } catch (listenerErr) {
        console.warn("[Axiom Popup] Error in onChanged listener callback:", listenerErr.message);
      }
    });
  }
} catch (err) {
  console.warn("[Axiom Popup] Failed to initialize onChanged storage listener:", err.message);
}

// Setup switching tabs
function setupTabSwitching() {
  const tabs = [tabOptimizeBtn, tabSettingsBtn];
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanelId = tab.getAttribute('data-target');
      
      // Update Tab Button styles
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Toggle Panels
      [optimizePanel, settingsPanel].forEach(panel => {
        if (panel.id === targetPanelId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
      
      // Clear JSON error logs when leaving Settings tab
      if (targetPanelId !== 'settings-panel') {
        jsonErrorStatus.textContent = '';
        jsonErrorStatus.className = 'json-status';
      }
    });
  });
}

// Core Event Listeners
function setupEventListeners() {
  // 1. Raw prompt character counter & text saver
  rawPromptInput.addEventListener('input', (e) => {
    try {
      const text = e.target.value;
      updateCharCounter(text);
      // Persist input to local storage (un-interrupted save)
      chrome.storage.local.set({ savedInput: text });
    } catch (err) {
      console.warn("[Axiom Popup] Storage set savedInput failed:", err.message);
    }
  });

  // 1b. Mode selection persistence
  modeSelect.addEventListener('change', (e) => {
    try {
      chrome.storage.local.set({ lastActiveModeId: e.target.value });
    } catch (err) {
      console.warn("[Axiom Popup] Storage set lastActiveModeId failed:", err.message);
    }
  });

  // 1c. Prompt length selection persistence
  lengthBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      try {
        const lengthVal = e.currentTarget.getAttribute('data-length');
        updateSelectedLengthUI(lengthVal);
        chrome.storage.local.set({ selectedLength: lengthVal });
      } catch (err) {
        console.warn("[Axiom Popup] Storage set selectedLength failed:", err.message);
      }
    });
  });

  // 2. Quick fix banner click
  apiAlertBanner.addEventListener('click', () => {
    try {
      chrome.runtime.openOptionsPage();
    } catch (err) {
      console.warn("[Axiom Popup] openOptionsPage failed:", err.message);
    }
  });

  // 2b. Open options button in Settings tab
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      try {
        chrome.runtime.openOptionsPage();
      } catch (err) {
        console.warn("[Axiom Popup] openOptionsPage failed:", err.message);
      }
    });
  }



  // 4. Reset settings back to defaults
  resetDefaultsBtn.addEventListener('click', async () => {
    try {
      if (confirm("Are you sure you want to reset all prompt engineering modes to defaults? This will erase custom additions.")) {
        const defaultModes = await resetModes();
        jsonModesEditor.value = JSON.stringify(defaultModes, null, 2);
        
        jsonErrorStatus.textContent = "Modes reset to defaults successfully.";
        jsonErrorStatus.className = "json-status success";
        
        // Repopulate select
        await renderModes();
      }
    } catch (err) {
      console.warn("[Axiom Popup] resetDefaultsBtn failed:", err.message);
    }
  });

  // 5. Save settings configurations
  saveSettingsBtn.addEventListener('click', async () => {
    try {
      const rawModel = modelSelect.value;
      const rawDefaultLength = defaultLengthSelect.value;
      const jsonString = jsonModesEditor.value;

      // Save configurations
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.innerHTML = `<div class="spinner"></div><span>Saving...</span>`;

      // Validate and save Modes JSON
      const modeValidation = await saveModes(jsonString);
      
      if (!modeValidation.success) {
        jsonErrorStatus.textContent = `JSON Error: ${modeValidation.error}`;
        jsonErrorStatus.className = "json-status error";
        revertSaveButtonState();
        return;
      }

      // Save API key, model & default length to storage
      await chrome.storage.local.set({
        selectedModel: rawModel,
        defaultLength: rawDefaultLength
      });

      // Automatically synchronize the active prompt length selector state
      updateSelectedLengthUI(rawDefaultLength);
      await chrome.storage.local.set({ selectedLength: rawDefaultLength });

      // Success response
      jsonErrorStatus.textContent = "Settings saved successfully!";
      jsonErrorStatus.className = "json-status success";
      
      await renderModes();
      
      setTimeout(() => {
        revertSaveButtonState();
      }, 1000);
    } catch (err) {
      console.warn("[Axiom Popup] saveSettingsBtn failed:", err.message);
      revertSaveButtonState();
    }
  });

  // 6. Optimize CTA click
  optimizeCtaBtn.addEventListener('click', async () => {
    try {
      const rawPrompt = rawPromptInput.value.trim();
      const selectedModeId = modeSelect.value;

      if (rawPrompt === "") {
        alert("Please enter a raw prompt to optimize.");
        return;
      }

      // Double check if API Key exists
      const { apiKey = '' } = await chrome.storage.local.get(['apiKey']);
      if (!apiKey) {
        alert("API Key is missing. Please configure it in the Options page.");
        chrome.runtime.openOptionsPage();
        return;
      }

      // Set loading UI
      setLoadingState(true);
      outputSection.style.display = 'block';
      optimizedPromptOutput.textContent = '';
      optimizedPromptOutput.classList.remove('placeholder-text');
      optimizedPromptOutput.style.color = '#ffffff';

      // Establish a long-lived stream port connection to the background script
      const port = chrome.runtime.connect({ name: 'axiom-stream-port' });
      
      port.postMessage({
        type: 'OPTIMIZE_PROMPT_STREAM',
        rawPrompt,
        selectedModeId,
        selectedLength
      });

      let accumulatedText = '';

      port.onMessage.addListener((response) => {
        try {
          if (response.type === 'CHUNK') {
            accumulatedText += response.text;
            showOutput(accumulatedText);
          } else if (response.type === 'SUCCESS') {
            setLoadingState(false);
            showOutput(response.state.optimizedPrompt);
            port.disconnect();
          } else if (response.type === 'ERROR') {
            setLoadingState(false);
            showError(response.state.error);
            port.disconnect();
          }
        } catch (innerErr) {
          console.warn("[Axiom Popup] Error processing port message chunk:", innerErr.message);
        }
      });

      port.onDisconnect.addListener(() => {
        console.log("[Axiom Popup] Port stream disconnected.");
      });
    } catch (err) {
      console.warn("[Axiom Popup] Optimization trigger pipeline failed:", err.message);
      setLoadingState(false);
    }
  });

  // 7. Copy to clipboard button
  copyBtn.addEventListener('click', () => {
    const textToCopy = optimizedPromptOutput.textContent;
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      // Toggle button visual state
      copyBtn.classList.add('copied');
      copyBtn.querySelector('.copy-svg').style.display = 'none';
      copyBtn.querySelector('.check-svg').style.display = 'block';

      // Slide in toast notification
      copyToast.classList.add('show');

      // Revert states
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('.copy-svg').style.display = 'block';
        copyBtn.querySelector('.check-svg').style.display = 'none';
        copyToast.classList.remove('show');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  });
}

// Helper methods
function updateCharCounter(text) {
  const count = text.length;
  charCountLabel.textContent = `${count} ${count === 1 ? 'char' : 'chars'}`;
}

function toggleApiAlertBanner(key) {
  if (!key) {
    apiAlertBanner.style.display = 'flex';
  } else {
    apiAlertBanner.style.display = 'none';
  }
}

function updateSelectedLengthUI(length) {
  selectedLength = length;
  lengthBtns.forEach(btn => {
    if (btn.getAttribute('data-length') === length) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setLoadingState(isLoading) {
  if (isLoading) {
    optimizeCtaBtn.disabled = true;
    optimizeCtaBtn.innerHTML = `<div class="spinner"></div><span>Optimizing Prompt...</span>`;
    rawPromptInput.disabled = true;
    modeSelect.disabled = true;
    lengthBtns.forEach(btn => btn.disabled = true);
  } else {
    optimizeCtaBtn.disabled = false;
    optimizeCtaBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
      <span>Optimize Prompt</span>
    `;
    rawPromptInput.disabled = false;
    modeSelect.disabled = false;
    lengthBtns.forEach(btn => btn.disabled = false);
  }
}

function showOutput(optimizedText) {
  outputSection.style.display = 'block';
  optimizedPromptOutput.textContent = optimizedText;
  optimizedPromptOutput.classList.remove('placeholder-text');
  optimizedPromptOutput.style.color = '#ffffff'; // Pristine minimalist white
  
  // Instantly scroll container during active streaming to prevent visual jitter and scroll queues
  const mainEl = document.querySelector('main');
  if (mainEl) {
    mainEl.scrollTop = mainEl.scrollHeight;
  }
}

function showError(errorMessage) {
  outputSection.style.display = 'block';
  optimizedPromptOutput.textContent = errorMessage;
  optimizedPromptOutput.classList.add('placeholder-text');
  optimizedPromptOutput.style.color = '#fca5a5'; // Soft understated warning red
}

function revertSaveButtonState() {
  saveSettingsBtn.disabled = false;
  saveSettingsBtn.innerHTML = 'Save Settings';
}
