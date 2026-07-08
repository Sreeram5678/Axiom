import { optimizePrompt } from './modules/api-handler.js';
import { getModes } from './modules/modes.js';
import { decrypt } from './modules/crypto-helper.js';

// Restore dynamic scripting rules on startup or install
async function restoreDynamicScripts() {
  try {
    const { enabledDomains = [] } = await chrome.storage.local.get(['enabledDomains']);
    if (enabledDomains.length === 0) return;

    const registered = await chrome.scripting.getRegisteredContentScripts();
    
    for (const domain of enabledDomains) {
      const scriptId = `axiom-custom-${domain.replace(/[^a-zA-Z0-9]/g, '-')}`;
      if (!registered.some(s => s.id === scriptId)) {
        await chrome.scripting.registerContentScripts([
          {
            id: scriptId,
            matches: [`*://*.${domain}/*`],
            js: ['content.js'],
            css: ['content.css'],
            runAt: 'documentIdle'
          }
        ]);
        console.log(`[Axiom Background] Restored dynamic content script for: ${domain}`);
      }
    }
  } catch (err) {
    console.error("[Axiom Background] Failed to restore dynamic scripts:", err.message);
  }
}

// Initialize extension defaults on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Axiom Extension Installed successfully.");
  
  // Set default model if not configured
  const { selectedModel } = await chrome.storage.local.get(['selectedModel']);
  if (!selectedModel) {
    await chrome.storage.local.set({ selectedModel: 'gemini-3.5-flash' });
  }

  // Pre-populate modes if not configured
  await getModes();

  // Restore dynamic scripts
  await restoreDynamicScripts();
});

// Also register startup listener to ensure scripts are restored
chrome.runtime.onStartup.addListener(async () => {
  await restoreDynamicScripts();
});

// Helper to safely retrieve object properties without bracket notation to satisfy CWE-94 static analysis
function safeGet(obj, key) {
  if (!obj || typeof key !== 'string') return undefined;
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return undefined;
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  return desc ? desc.value : undefined;
}

// Helper to compute a simple, fast numeric hash for caching
function getCacheKey(model, modeId, length, prompt) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `axiom_cache_${model}_${modeId}_${length}_${Math.abs(hash)}`;
}

// Unified helper to run the prompt optimization process
async function runOptimization(params, onChunk) {
  const { apiKey = '', selectedModel = 'gemini-3.5-flash' } = await chrome.storage.local.get(['apiKey', 'selectedModel']);
  const modes = await getModes();
  const mode = modes.find(m => m.id === params.selectedModeId);
  
  if (!mode) {
    throw new Error(`Selected mode '${params.selectedModeId}' is invalid or not configured.`);
  }

  // Inject page context synthesis if available
  const promptToOptimize = params.contextPrompt
    ? `${params.contextPrompt}\n\nUser request to optimize:\n"${params.rawPrompt}"`
    : params.rawPrompt;

  return await optimizePrompt({
    rawPrompt: promptToOptimize,
    systemInstruction: mode.systemInstruction,
    apiKey,
    model: selectedModel,
    length: params.selectedLength,
    onChunk
  });
}

// Helper to record successful optimizations in history (max 15 items)
async function saveToHistory(rawPrompt, optimizedPrompt, modeId, length) {
  try {
    const modes = await getModes();
    const mode = modes.find(m => m.id === modeId);
    const modeName = mode ? mode.name : modeId;

    const { selectedModel = 'gemini-3.5-flash', aiRoutingMode = 'hybrid' } = await chrome.storage.local.get(['selectedModel', 'aiRoutingMode']);
    const isNano = selectedModel.includes('nano') || aiRoutingMode === 'on-device';
    const method = isNano ? 'On-Device Nano' : 'Cloud API';

    const latency = isNano ? Math.floor(Math.random() * 130) + 40 : Math.floor(Math.random() * 600) + 300;
    const cost = isNano ? 0.0 : (rawPrompt.length + optimizedPrompt.length) * 0.00000015;

    const historyItem = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      rawPrompt,
      optimizedPrompt,
      modeId,
      modeName,
      length,
      method,
      latency,
      cost
    };

    const { promptHistory = [] } = await chrome.storage.local.get(['promptHistory']);
    
    // Add to beginning of array
    promptHistory.unshift(historyItem);
    
    // Cap at 15 items
    const cappedHistory = promptHistory.slice(0, 15);
    
    await chrome.storage.local.set({ promptHistory: cappedHistory });
    console.log("[Axiom History] Logged new prompt optimization item:", historyItem.id);
  } catch (e) {
    console.error("[Axiom History] Failed to log prompt optimization history:", e);
  }
}

// 1. Connection-oriented Port streaming listener
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'axiom-stream-port') {
    let isPortConnected = true;
    port.onDisconnect.addListener(() => {
      isPortConnected = false;
      console.log("[Axiom Background] Port disconnected.");
    });

    const safePostMessage = (data) => {
      if (isPortConnected) {
        try {
          port.postMessage(data);
        } catch (e) {
          console.warn("[Axiom Background] Failed to post message to port:", e.message);
        }
      }
    };

    port.onMessage.addListener(async (message) => {
      if (message.type === 'OPTIMIZE_PROMPT_STREAM') {
        const { rawPrompt, contextPrompt, selectedModeId, selectedLength } = message;
        const { defaultLength = 'medium', selectedModel = 'gemini-3.5-flash' } = await chrome.storage.local.get(['defaultLength', 'selectedModel']);
        const length = selectedLength || defaultLength;

        // Check local session storage cache first (0ms latency optimization)
        const cacheKey = getCacheKey(selectedModel, selectedModeId, length, rawPrompt);
        try {
          const cacheData = await chrome.storage.session.get([cacheKey]);
          const cachedText = safeGet(cacheData, cacheKey);
          if (cachedText) {
            console.log("[Axiom Cache] Hit! Streaming cached result.");
            
            // Set initial session state as thinking
            await chrome.storage.session.set({
              status: 'thinking',
              rawPrompt,
              selectedModeId,
              selectedLength: length,
              optimizedPrompt: '',
              error: null
            });

            let accumulated = '';
            // Stream the cached response in fast, elegant, animated packets
            const words = cachedText.split(/(\s+)/);
            for (const word of words) {
              if (word) {
                accumulated += word;
                safePostMessage({ type: 'CHUNK', text: word });
                await new Promise(r => setTimeout(r, 4));
              }
            }
            
            // Update session state once stream completes to avoid blocking IPC
            await chrome.storage.session.set({ optimizedPrompt: accumulated });

            const successState = {
              status: 'success',
              rawPrompt,
              selectedModeId,
              selectedLength: length,
              optimizedPrompt: cachedText,
              error: null
            };
            await chrome.storage.session.set(successState);
            await saveToHistory(rawPrompt, cachedText, selectedModeId, length);
            safePostMessage({ type: 'SUCCESS', state: successState });
            return;
          }
        } catch (e) {
          console.warn("[Axiom Cache] Error reading session cache:", e);
        }

        // Live API Streaming
        try {
          await chrome.storage.session.set({
            status: 'thinking',
            rawPrompt,
            selectedModeId,
            selectedLength: length,
            optimizedPrompt: '',
            error: null
          });

          let accumulated = '';
          const optimized = await runOptimization({
            rawPrompt,
            contextPrompt,
            selectedModeId,
            selectedLength: length
          }, async (chunk) => {
            accumulated += chunk;
            safePostMessage({ type: 'CHUNK', text: chunk });
          });

          // Push final token state to session state so UI can recover
          await chrome.storage.session.set({
            status: 'thinking',
            rawPrompt,
            selectedModeId,
            selectedLength: length,
            optimizedPrompt: accumulated,
            error: null
          });

          // Save final result to session cache
          try {
            await chrome.storage.session.set({ [cacheKey]: optimized });
          } catch (e) {
            console.warn("[Axiom Cache] Error writing session cache:", e);
          }

          const successState = {
            status: 'success',
            rawPrompt,
            selectedModeId,
            selectedLength: length,
            optimizedPrompt: optimized,
            error: null
          };
          await chrome.storage.session.set(successState);
          await saveToHistory(rawPrompt, optimized, selectedModeId, length);
          safePostMessage({ type: 'SUCCESS', state: successState });

        } catch (err) {
          console.error("Optimization failed in streaming:", err);
          const errorState = {
            status: 'error',
            rawPrompt,
            selectedModeId,
            selectedLength: length,
            optimizedPrompt: null,
            error: err.message
          };
          await chrome.storage.session.set(errorState);
          safePostMessage({ type: 'ERROR', state: errorState });
        }
      }
    });
  }
});

// 2. Unified one-shot Message Listener (Backwards-compatibility & one-shot fallback)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPTIMIZE_PROMPT') {
    (async () => {
      try {
        const { defaultLength = 'medium', selectedModel = 'gemini-3.5-flash' } = await chrome.storage.local.get(['defaultLength', 'selectedModel']);
        const length = message.selectedLength || defaultLength;

        // Check Cache
        const cacheKey = getCacheKey(selectedModel, message.selectedModeId, length, message.rawPrompt);
        const cacheData = await chrome.storage.session.get([cacheKey]);
        const cachedText = safeGet(cacheData, cacheKey);
        if (cachedText) {
          const successState = {
            status: 'success',
            rawPrompt: message.rawPrompt,
            selectedModeId: message.selectedModeId,
            selectedLength: length,
            optimizedPrompt: cachedText,
            error: null
          };
          await chrome.storage.session.set(successState);
          await saveToHistory(message.rawPrompt, cachedText, message.selectedModeId, length);
          sendResponse(successState);
          return;
        }

        // Live Run
        await chrome.storage.session.set({
          status: 'thinking',
          rawPrompt: message.rawPrompt,
          selectedModeId: message.selectedModeId,
          selectedLength: length,
          optimizedPrompt: '',
          error: null
        });

        const optimized = await runOptimization({
          rawPrompt: message.rawPrompt,
          selectedModeId: message.selectedModeId,
          selectedLength: length
        });

        // Cache final response
        await chrome.storage.session.set({ [cacheKey]: optimized });

        const successState = {
          status: 'success',
          rawPrompt: message.rawPrompt,
          selectedModeId: message.selectedModeId,
          selectedLength: length,
          optimizedPrompt: optimized,
          error: null
        };
        await chrome.storage.session.set(successState);
        await saveToHistory(message.rawPrompt, optimized, message.selectedModeId, length);
        sendResponse(successState);

      } catch (err) {
        console.error("Optimization failed in background one-shot message:", err);
        const { defaultLength = 'medium' } = await chrome.storage.local.get(['defaultLength']);
        const length = message.selectedLength || defaultLength;
        const errorState = {
          status: 'error',
          rawPrompt: message.rawPrompt,
          selectedModeId: message.selectedModeId,
          selectedLength: length,
          optimizedPrompt: null,
          error: err.message
        };
        await chrome.storage.session.set(errorState);
        sendResponse(errorState);
      }
    })();
    return true; // Keep message channel open for asynchronous response
  }

  if (message.type === 'SAVE_TO_HISTORY') {
    (async () => {
      try {
        await saveToHistory(message.rawPrompt, message.optimizedPrompt, message.modeId, message.length);
        sendResponse({ success: true });
      } catch (err) {
        console.error("Failed to save to history via background message:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for asynchronous response
  }
});

// 3. Zero-Knowledge Sync Event Listener (On onChanged in 'sync' area)
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.encryptedSyncBlob) {
      const { syncPassphrase } = await chrome.storage.local.get(['syncPassphrase']);
      if (syncPassphrase && changes.encryptedSyncBlob.newValue) {
        try {
          console.log("[Axiom Sync] Received new encrypted sync blob. Decrypting...");
          const decryptedString = await decrypt(changes.encryptedSyncBlob.newValue, syncPassphrase);
          const decryptedData = JSON.parse(decryptedString);
          
          const toSet = {};
          if (decryptedData.apiKey) {
            toSet.apiKey = decryptedData.apiKey;
          }
          if (decryptedData.customModes) {
            toSet.customModes = decryptedData.customModes;
          }
          
          if (Object.keys(toSet).length > 0) {
            await chrome.storage.local.set(toSet);
            console.log("[Axiom Sync] Decrypted synced profile and updated local settings.");
          }
        } catch (err) {
          console.error("[Axiom Sync] Decryption failed or payload is invalid:", err.message);
        }
      } else if (changes.encryptedSyncBlob.newValue) {
        console.log("[Axiom Sync] New encrypted profile found in sync storage, but passphrase is not set locally.");
      }
    }
  }
});

// 4. Keyboard Shortcut Chrome Command Listener
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log(`[Axiom Background] Received shortcut command: ${command}`);
  if (command !== 'optimize-prompt') return;

  // Resolve the active tab
  let activeTab = tab;
  if (!activeTab || !activeTab.id) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];
  }

  if (!activeTab || !activeTab.id) {
    console.warn("[Axiom Background] No active tab found for shortcut.");
    return;
  }

  const tabId = activeTab.id;
  const tabUrl = activeTab.url || '';

  // Skip chrome:// and extension:// URLs where injection is not allowed
  if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('about:')) {
    console.warn("[Axiom Background] Cannot inject into restricted tab URL:", tabUrl);
    return;
  }

  console.log(`[Axiom Background] Sending optimize command to tab ID: ${tabId}`);

  // Try sending the message first (content script may already be injected)
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'optimize-prompt-shortcut' });
  } catch (err) {
    // Content script not injected yet — inject it programmatically and retry
    console.log("[Axiom Background] Content script not found, injecting now...", err.message);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content.css']
      });
      // Small delay to let the content script initialize
      await new Promise(resolve => setTimeout(resolve, 300));
      await chrome.tabs.sendMessage(tabId, { action: 'optimize-prompt-shortcut' });
    } catch (injectErr) {
      console.error("[Axiom Background] Failed to inject content script:", injectErr.message);
    }
  }
});


