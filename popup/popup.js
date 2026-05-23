import { getModes, saveModes, resetModes } from '../modules/modes.js';
import { encrypt, decrypt } from '../modules/crypto-helper.js';

// DOM Elements
const tabOptimizeBtn = document.getElementById('tab-optimize-btn');
const tabHistoryBtn = document.getElementById('tab-history-btn');
const tabSettingsBtn = document.getElementById('tab-settings-btn');

const optimizePanel = document.getElementById('optimize-panel');
const historyPanel = document.getElementById('history-panel');
const settingsPanel = document.getElementById('settings-panel');

const apiAlertBanner = document.getElementById('api-alert-banner');
const rawPromptInput = document.getElementById('raw-prompt-input');
const charCountLabel = document.getElementById('char-count');
const modesGridContainer = document.getElementById('modes-grid-container');
const lengthBtns = document.querySelectorAll('.length-btn');
const optimizeCtaBtn = document.getElementById('optimize-cta-btn');

const outputSection = document.getElementById('output-section');
const optimizedPromptOutput = document.getElementById('optimized-prompt-output');
const copyBtn = document.getElementById('copy-btn');
const copyToast = document.getElementById('copy-toast');
const openOptionsBtn = document.getElementById('open-options-btn');

const modelSelect = document.getElementById('model-select');
const defaultLengthSelect = document.getElementById('default-length-select');
const aiRoutingSelect = document.getElementById('ai-routing-select');
const ramTip = document.getElementById('ram-tip');
const widgetToggleCheckbox = document.getElementById('widget-toggle-checkbox');

const syncStatusBadge = document.getElementById('sync-status-badge');
const syncPassphraseInput = document.getElementById('sync-passphrase-input');
const syncPassphraseWrapper = document.getElementById('sync-passphrase-wrapper');
const enableSyncBtn = document.getElementById('enable-sync-btn');
const disableSyncBtn = document.getElementById('disable-sync-btn');

const jsonModesEditor = document.getElementById('json-modes-editor');
const jsonErrorStatus = document.getElementById('json-error-status');
const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// Mode Manager Elements
const addModeToggleBtn = document.getElementById('add-mode-toggle-btn');
const modeCreatorForm = document.getElementById('mode-creator-form');
const newModeName = document.getElementById('new-mode-name');
const newModeDesc = document.getElementById('new-mode-desc');
const newModeInstruction = document.getElementById('new-mode-instruction');
const newModeIcon = document.getElementById('new-mode-icon');
const saveNewModeBtn = document.getElementById('save-new-mode-btn');
const modeCreatorError = document.getElementById('mode-creator-error');
const visualModesList = document.getElementById('visual-modes-list');

// History Panel Elements
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyList = document.getElementById('history-list');

// State variables
let currentModes = [];
let activeModeId = 'analyst';
let selectedLength = 'medium';

// DOMContentLoaded Entry point
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial setups
  await initializeUI();

  // 2. Event Listeners
  setupTabSwitching();
  setupEventListeners();
  setupModeCreator();

  // 3. Check for any in-progress background optimization
  await checkSessionState();
});

// UI Initialization
async function initializeUI() {
  try {
    // Load API Key, Model settings, prompt length & last selected Mode
    const { apiKey = '', selectedModel = 'gemini-3.1-flash-lite', savedInput = '', lastActiveModeId = 'analyst', selectedLength = '', defaultLength = 'medium', aiRoutingMode = 'hybrid', hideWidgetEntirely = false } = await chrome.storage.local.get(['apiKey', 'selectedModel', 'savedInput', 'lastActiveModeId', 'selectedLength', 'defaultLength', 'aiRoutingMode', 'hideWidgetEntirely']);
    
    modelSelect.value = selectedModel;
    defaultLengthSelect.value = defaultLength;
    rawPromptInput.value = savedInput;
    updateCharCounter(savedInput);
    
    activeModeId = lastActiveModeId;
    
    // Set AI Routing Mode select value
    if (aiRoutingSelect) {
      aiRoutingSelect.value = aiRoutingMode;
    }

    // Set floating widget visibility value
    if (widgetToggleCheckbox) {
      widgetToggleCheckbox.checked = !hideWidgetEntirely;
    }
    
    // 8GB RAM tip detection
    if (ramTip) {
      if (navigator.deviceMemory && navigator.deviceMemory <= 8) {
        ramTip.textContent = "(8GB RAM detected — Hybrid Auto recommended)";
        ramTip.style.display = "block";
      } else {
        ramTip.style.display = "none";
      }
    }
    
    // Set selected prompt length and update UI (falls back to defaultLength if no active selection is saved)
    const activeLength = selectedLength || defaultLength;
    updateSelectedLengthUI(activeLength);

    // Toggle API alert banner based on API key availability
    toggleApiAlertBanner(apiKey);

    // Render Sync UI
    await renderSyncUI();

    // Render optimization modes select cards, Settings visual manager and raw JSON editor
    await renderModes();
  } catch (err) {
    console.warn("[Axiom Popup] Context invalidated or error during UI initialization:", err.message);
  }
}

// Zero-Knowledge Sync UI state manager
async function renderSyncUI() {
  try {
    const syncData = await chrome.storage.sync.get(['encryptedSyncBlob']);
    const localData = await chrome.storage.local.get(['syncPassphrase']);
    
    const encryptedSyncBlob = syncData.encryptedSyncBlob;
    const syncPassphrase = localData.syncPassphrase;
    
    if (encryptedSyncBlob && !syncPassphrase) {
      // Sync profile found, but not active on this device (passphrase required to decrypt)
      syncStatusBadge.style.display = 'block';
      syncStatusBadge.className = 'sync-badge pending';
      syncStatusBadge.textContent = 'Encrypted Profile Found — Enter Passphrase to Decrypt';
      
      syncPassphraseWrapper.style.display = 'block';
      enableSyncBtn.textContent = 'Decrypt Profile';
      enableSyncBtn.style.display = 'block';
      disableSyncBtn.style.display = 'none';
    } else if (syncPassphrase) {
      // Sync is active
      syncStatusBadge.style.display = 'block';
      syncStatusBadge.className = 'sync-badge active';
      syncStatusBadge.textContent = 'Zero-Knowledge Sync Active';
      
      syncPassphraseWrapper.style.display = 'none';
      syncPassphraseInput.value = '';
      enableSyncBtn.style.display = 'none';
      disableSyncBtn.style.display = 'block';
    } else {
      // No sync configured
      syncStatusBadge.style.display = 'none';
      syncPassphraseWrapper.style.display = 'block';
      enableSyncBtn.textContent = 'Enable Sync';
      enableSyncBtn.style.display = 'block';
      disableSyncBtn.style.display = 'none';
    }
  } catch (e) {
    console.warn("[Axiom Sync] Error rendering Sync UI:", e);
  }
}

// Encrypt current profile settings and synchronize to storage.sync
async function encryptAndSyncProfile(passphrase) {
  try {
    const localData = await chrome.storage.local.get(['apiKey', 'customModes']);
    const payload = {
      apiKey: localData.apiKey || '',
      customModes: localData.customModes || []
    };
    const encryptedJson = await encrypt(JSON.stringify(payload), passphrase);
    await chrome.storage.sync.set({ encryptedSyncBlob: encryptedJson });
    console.log("[Axiom Sync] Profile encrypted and synced successfully.");
  } catch (err) {
    console.error("[Axiom Sync] Encryption & Sync failed:", err);
  }
}

// Render Select Cards Grid, Settings Visual List, and JSON editor
async function renderModes() {
  try {
    currentModes = await getModes();
    
    // Re-verify that lastActiveModeId is still valid
    const { lastActiveModeId = 'analyst' } = await chrome.storage.local.get(['lastActiveModeId']);
    if (currentModes.some(m => m.id === lastActiveModeId)) {
      activeModeId = lastActiveModeId;
    } else {
      activeModeId = currentModes[0]?.id || 'analyst';
      await chrome.storage.local.set({ lastActiveModeId: activeModeId });
    }

    // Populate the Modes Card Grid
    renderModesGrid();

    // Populate the Settings Visual List
    renderVisualModesList();

    // Populate raw JSON editor in Settings
    jsonModesEditor.value = JSON.stringify(currentModes, null, 2);
  } catch (err) {
    console.warn("[Axiom Popup] Context invalidated or error during renderModes:", err.message);
  }
}

// Dynamically render modes cards grid in main panel
// Dynamically render modes cards grid in main panel
function renderModesGrid() {
  if (!modesGridContainer) return;
  modesGridContainer.innerHTML = '';
  
  const colorMap = {
    'analyst': '#60a5fa',         // Analytical Blue
    'engineer': '#34d399',        // Technical Green
    'first-principles': '#c084fc',// Philosophical Purple
    'exec-summary': '#fbbf24',    // Strategic Gold
    
    'blue': '#60a5fa',
    'green': '#34d399',
    'purple': '#c084fc',
    'yellow': '#fbbf24',
    'red': '#f87171',
    'pink': '#f472b6',
    'grey': '#a1a1aa'
  };

  currentModes.forEach(mode => {
    const card = document.createElement('div');
    card.className = `mode-card ${mode.id === activeModeId ? 'active' : ''}`;
    card.setAttribute('data-mode-id', mode.id);
    
    const color = colorMap[mode.icon] || colorMap[mode.id] || '#a1a1aa';
    
    card.innerHTML = `
      <div class="mode-card-header">
        <span class="mode-card-dot" style="background-color: ${color}; --dot-color: ${color};"></span>
        <span class="mode-card-name">${mode.name}</span>
      </div>
      <div class="mode-card-desc">${mode.description}</div>
    `;
    
    card.addEventListener('click', async () => {
      activeModeId = mode.id;
      document.querySelectorAll('.mode-card').forEach(el => el.classList.remove('active'));
      card.classList.add('active');
      await chrome.storage.local.set({ lastActiveModeId: activeModeId });
    });
    
    modesGridContainer.appendChild(card);
  });
}

// Dynamically render visual modes creator list in Settings
function renderVisualModesList() {
  if (!visualModesList) return;
  visualModesList.innerHTML = '';

  const colorMap = {
    'analyst': '#60a5fa',         // Analytical Blue
    'engineer': '#34d399',        // Technical Green
    'first-principles': '#c084fc',// Philosophical Purple
    'exec-summary': '#fbbf24',    // Strategic Gold
    
    'blue': '#60a5fa',
    'green': '#34d399',
    'purple': '#c084fc',
    'yellow': '#fbbf24',
    'red': '#f87171',
    'pink': '#f472b6',
    'grey': '#a1a1aa'
  };

  currentModes.forEach(mode => {
    const item = document.createElement('div');
    item.className = 'visual-mode-item';
    
    const isDefault = ['analyst', 'engineer', 'first-principles', 'exec-summary'].includes(mode.id);
    const color = colorMap[mode.icon] || colorMap[mode.id] || '#a1a1aa';
    
    item.innerHTML = `
      <div class="visual-mode-info">
        <span class="visual-mode-dot" style="background-color: ${color}; --dot-color: ${color};"></span>
        <div class="visual-mode-text">
          <span class="visual-mode-name">${mode.name}</span>
          <span class="visual-mode-desc">${mode.description}</span>
        </div>
      </div>
      <div class="visual-mode-actions">
        ${isDefault ? `
          <span class="btn-icon-action" title="System Mode (Immutable)" style="cursor: not-allowed; display: inline-flex; align-items: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.45;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </span>
        ` : `
          <button class="btn-icon-action delete-action" title="Delete Mode" style="display: inline-flex; align-items: center; justify-content: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        `}
      </div>
    `;
    
    // Setup delete action
    if (!isDefault) {
      const deleteBtn = item.querySelector('.delete-action');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the custom mode "${mode.name}"?`)) {
          currentModes = currentModes.filter(m => m.id !== mode.id);
          
          const validation = await saveModes(JSON.stringify(currentModes));
          if (validation.success) {
            await renderModes();
          } else {
            alert(`Error deleting mode: ${validation.error}`);
          }
        }
      });
    }
    
    visualModesList.appendChild(item);
  });
}

// Set up the Visual Mode Creator form logic in Settings
function setupModeCreator() {
  if (!addModeToggleBtn || !modeCreatorForm) return;

  // Toggle Creator form display
  addModeToggleBtn.addEventListener('click', () => {
    const isVisible = modeCreatorForm.style.display === 'flex' || modeCreatorForm.style.display === 'block';
    if (isVisible) {
      modeCreatorForm.style.display = 'none';
      addModeToggleBtn.textContent = '+ Add Mode';
    } else {
      modeCreatorForm.style.display = 'block';
      addModeToggleBtn.textContent = 'Cancel';
      modeCreatorError.textContent = '';
      
      // Scroll to bottom of Settings tab so the form is completely visible
      setTimeout(() => {
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTop = mainEl.scrollHeight;
      }, 50);
    }
  });

  // Save new custom mode action
  saveNewModeBtn.addEventListener('click', async () => {
    modeCreatorError.textContent = '';
    const name = newModeName.value.trim();
    const desc = newModeDesc.value.trim();
    const instruction = newModeInstruction.value.trim();
    const icon = newModeIcon.value;

    if (!name || !desc || !instruction) {
      modeCreatorError.textContent = "Please fill in all form fields.";
      return;
    }

    const newId = 'custom_' + Date.now().toString(36);
    const newMode = {
      id: newId,
      name,
      description: desc,
      systemInstruction: instruction,
      icon
    };

    currentModes.push(newMode);
    
    // Save custom mode array through modes helper
    const validation = await saveModes(JSON.stringify(currentModes));
    if (!validation.success) {
      modeCreatorError.textContent = `Error saving mode: ${validation.error}`;
      currentModes.pop(); // Remove invalid item
      return;
    }

    // Reset creator inputs
    newModeName.value = '';
    newModeDesc.value = '';
    newModeInstruction.value = '';
    newModeIcon.selectedIndex = 0;

    // Close form panel
    modeCreatorForm.style.display = 'none';
    addModeToggleBtn.textContent = '+ Add Mode';

    // Rerender all components
    await renderModes();
  });
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
    
    activeModeId = state.selectedModeId || 'analyst';
    document.querySelectorAll('.mode-card').forEach(el => {
      if (el.getAttribute('data-mode-id') === activeModeId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

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
  const tabs = [tabOptimizeBtn, tabHistoryBtn, tabSettingsBtn];
  const panels = [optimizePanel, historyPanel, settingsPanel];
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanelId = tab.getAttribute('data-target');
      
      // Update Tab Button styles
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Toggle Panels
      panels.forEach(panel => {
        if (panel.id === targetPanelId) {
          panel.classList.add('active');
          
          // Trigger history render when history panel opens
          if (targetPanelId === 'history-panel') {
            renderHistoryList();
          }
        } else {
          panel.classList.remove('active');
        }
      });
      
      // Clear JSON error logs when leaving Settings tab
      if (targetPanelId !== 'settings-panel') {
        jsonErrorStatus.textContent = '';
        jsonErrorStatus.className = 'json-status';
        
        // Hide mode creator form panel as well
        if (modeCreatorForm) {
          modeCreatorForm.style.display = 'none';
          addModeToggleBtn.textContent = '+ Add Mode';
        }
      }
    });
  });
}

// Core Event Listeners
function setupEventListeners() {
  // Instant Auto-save for In-Page Floating Widget Toggle (snappy reactivity)
  if (widgetToggleCheckbox) {
    widgetToggleCheckbox.addEventListener('change', async (e) => {
      try {
        const isChecked = e.target.checked;
        await chrome.storage.local.set({ hideWidgetEntirely: !isChecked });
      } catch (err) {
        console.warn("[Axiom Popup] Instant toggle save failed:", err.message);
      }
    });
  }

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

  // 1b. Prompt length selection persistence
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

  // 3. Clear History action
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      try {
        if (confirm("Are you sure you want to clear your entire prompt optimization history?")) {
          await chrome.storage.local.set({ promptHistory: [] });
          await renderHistoryList();
        }
      } catch (err) {
        console.warn("[Axiom Popup] clearHistoryBtn failed:", err.message);
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
        
        // Repopulate select cards & visual list
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
      const aiRoutingMode = aiRoutingSelect ? aiRoutingSelect.value : 'hybrid';
      const hideWidgetEntirely = widgetToggleCheckbox ? !widgetToggleCheckbox.checked : false;

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

      // Save API key, model, default length & routing mode to storage
      await chrome.storage.local.set({
        selectedModel: rawModel,
        defaultLength: rawDefaultLength,
        aiRoutingMode: aiRoutingMode,
        hideWidgetEntirely: hideWidgetEntirely
      });

      // Automatically synchronize the active prompt length selector state
      updateSelectedLengthUI(rawDefaultLength);
      await chrome.storage.local.set({ selectedLength: rawDefaultLength });

      // If sync is active, immediately encrypt and update the sync backup
      const localData = await chrome.storage.local.get(['syncPassphrase']);
      if (localData.syncPassphrase) {
        await encryptAndSyncProfile(localData.syncPassphrase);
      }

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

  // 5b. Enable/Decrypt Sync Click
  if (enableSyncBtn) {
    enableSyncBtn.addEventListener('click', async () => {
      try {
        const passphrase = syncPassphraseInput.value.trim();
        if (!passphrase) {
          alert("Please enter your sync passphrase.");
          return;
        }

        const isDecrypting = enableSyncBtn.textContent.includes('Decrypt') || 
                             (syncStatusBadge && syncStatusBadge.classList.contains('pending'));

        if (isDecrypting) {
          // Decrypt existing profile from storage.sync
          const syncData = await chrome.storage.sync.get(['encryptedSyncBlob']);
          if (!syncData.encryptedSyncBlob) {
            alert("No encrypted profile found in cloud sync.");
            return;
          }

          enableSyncBtn.disabled = true;
          enableSyncBtn.textContent = 'Decrypting...';

          try {
            const decryptedPayload = await decrypt(syncData.encryptedSyncBlob, passphrase);
            const profile = JSON.parse(decryptedPayload);

            // Store decrypted credentials and passphrase locally
            await chrome.storage.local.set({
              apiKey: profile.apiKey || '',
              customModes: profile.customModes || [],
              syncPassphrase: passphrase
            });

            syncPassphraseInput.value = '';
            alert("Profile decrypted and synchronized successfully.");
            
            // Reload UI to reflect new settings
            await initializeUI();
          } catch (decErr) {
            console.error("[Axiom Sync] Decryption failed:", decErr);
            alert("Invalid passphrase. Could not decrypt profile. Please verify your passphrase and try again.");
          } finally {
            enableSyncBtn.disabled = false;
            enableSyncBtn.textContent = 'Decrypt Profile';
          }
        } else {
          // Enable sync for the first time
          enableSyncBtn.disabled = true;
          enableSyncBtn.textContent = 'Enabling Sync...';

          try {
            await chrome.storage.local.set({ syncPassphrase: passphrase });
            await encryptAndSyncProfile(passphrase);
            syncPassphraseInput.value = '';
            alert("Zero-Knowledge Sync enabled and profile backed up.");
            await renderSyncUI();
          } catch (syncErr) {
            console.error("[Axiom Sync] Enabling sync failed:", syncErr);
            alert("Failed to enable sync. Please try again.");
          } finally {
            enableSyncBtn.disabled = false;
            enableSyncBtn.textContent = 'Enable Sync';
          }
        }
      } catch (err) {
        console.warn("[Axiom Sync] enableSyncBtn failed:", err.message);
      }
    });
  }

  // 5c. Disable Sync Click
  if (disableSyncBtn) {
    disableSyncBtn.addEventListener('click', async () => {
      try {
        if (confirm("Are you sure you want to disable Sync? This will remove the encrypted backup from cloud storage and local session. Your current settings will remain intact on this device.")) {
          disableSyncBtn.disabled = true;
          
          await chrome.storage.local.remove(['syncPassphrase']);
          await chrome.storage.sync.remove(['encryptedSyncBlob']);
          
          syncPassphraseInput.value = '';
          alert("Sync disabled and backup removed.");
          await renderSyncUI();
        }
      } catch (err) {
        console.warn("[Axiom Sync] disableSyncBtn failed:", err.message);
      } finally {
        if (disableSyncBtn) {
          disableSyncBtn.disabled = false;
        }
      }
    });
  }

  // 6. Optimize CTA click
  optimizeCtaBtn.addEventListener('click', async () => {
    try {
      const rawPrompt = rawPromptInput.value.trim();
      const selectedModeId = activeModeId;

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

// Render History log items (Starring, loading and copying)
async function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = '';

  const { promptHistory = [] } = await chrome.storage.local.get(['promptHistory']);

  if (promptHistory.length === 0) {
    historyList.innerHTML = `
      <div class="no-history-placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.45; margin-bottom: 6px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>No optimization history yet</span>
        <span style="font-size: 10px; opacity: 0.55; margin-top: 2px;">Your recent optimized prompts will be saved here automatically.</span>
      </div>
    `;
    return;
  }

  promptHistory.forEach(item => {
    const histItemEl = document.createElement('div');
    histItemEl.className = 'history-item';
    histItemEl.setAttribute('data-id', item.id);
    
    const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    histItemEl.innerHTML = `
      <div class="history-item-header">
        <div class="history-item-meta">
          <span class="history-item-badge">${item.modeName}</span>
          <span class="history-item-badge length-${item.length || 'medium'}">${item.length || 'medium'}</span>
        </div>
        <span class="history-item-time">${dateString}, ${timeString}</span>
      </div>
      <div class="history-item-body" title="Click to load raw prompt into editor">
        ${escapeHtml(item.rawPrompt)}
      </div>
      <div class="history-item-actions">
        <button class="history-action-btn copy-hist-btn" title="Copy Optimized Prompt">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="history-action-btn star-hist-btn ${item.starred ? 'star-active' : ''}" title="${item.starred ? 'Unstar Template' : 'Star as Template'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="${item.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
      </div>
    `;

    // Click to load raw prompt
    const bodyEl = histItemEl.querySelector('.history-item-body');
    bodyEl.addEventListener('click', async () => {
      rawPromptInput.value = item.rawPrompt;
      updateCharCounter(item.rawPrompt);
      await chrome.storage.local.set({ savedInput: item.rawPrompt });

      // Load matching length and mode ID
      if (item.length) {
        updateSelectedLengthUI(item.length);
        await chrome.storage.local.set({ selectedLength: item.length });
      }

      if (item.modeId) {
        activeModeId = item.modeId;
        await chrome.storage.local.set({ lastActiveModeId: activeModeId });
        
        // Re-toggle grid cards active styling
        document.querySelectorAll('.mode-card').forEach(el => {
          if (el.getAttribute('data-mode-id') === activeModeId) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });
      }

      // Hide output card (waiting for new optimization)
      outputSection.style.display = 'none';

      // Switch to main Optimize panel tab
      tabOptimizeBtn.click();
    });

    // Copy optimized prompt action
    const copyHistBtn = histItemEl.querySelector('.copy-hist-btn');
    copyHistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.optimizedPrompt).then(() => {
        // Success color flash
        copyHistBtn.style.color = '#a7f3d0';
        setTimeout(() => { copyHistBtn.style.color = ''; }, 1500);

        // Toast alert
        copyToast.classList.add('show');
        setTimeout(() => { copyToast.classList.remove('show'); }, 2000);
      });
    });

    // Star template toggle action
    const starHistBtn = histItemEl.querySelector('.star-hist-btn');
    starHistBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const { promptHistory = [] } = await chrome.storage.local.get(['promptHistory']);
        const updated = promptHistory.map(h => {
          if (h.id === item.id) {
            return { ...h, starred: !h.starred };
          }
          return h;
        });
        await chrome.storage.local.set({ promptHistory: updated });
        await renderHistoryList();
      } catch (err) {
        console.warn("[Axiom Popup] Star template toggle failed:", err.message);
      }
    });

    historyList.appendChild(histItemEl);
  });
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
    document.querySelectorAll('.mode-card').forEach(el => el.style.pointerEvents = 'none');
    lengthBtns.forEach(btn => btn.disabled = true);
  } else {
    optimizeCtaBtn.disabled = false;
    optimizeCtaBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
      <span>Optimize Prompt</span>
    `;
    rawPromptInput.disabled = false;
    document.querySelectorAll('.mode-card').forEach(el => el.style.pointerEvents = 'auto');
    lengthBtns.forEach(btn => btn.disabled = false);
  }
}

function showOutput(optimizedText) {
  outputSection.style.display = 'block';
  optimizedPromptOutput.textContent = optimizedText;
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
  optimizedPromptOutput.style.color = '#fca5a5'; // Soft understated warning red
}

function revertSaveButtonState() {
  saveSettingsBtn.disabled = false;
  saveSettingsBtn.innerHTML = 'Save Settings';
}
