import { optimizePrompt } from './modules/api-handler.js';
import { getModes } from './modules/modes.js';

// Initialize extension defaults on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Axiom Extension Installed successfully.");
  
  // Set default model if not configured
  const { selectedModel } = await chrome.storage.local.get(['selectedModel']);
  if (!selectedModel) {
    await chrome.storage.local.set({ selectedModel: 'gemini-3.1-flash-lite' });
  }

  // Pre-populate modes if not configured
  await getModes();
});

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
  const { apiKey = '', selectedModel = 'gemini-3.1-flash-lite' } = await chrome.storage.local.get(['apiKey', 'selectedModel']);
  const modes = await getModes();
  const mode = modes.find(m => m.id === params.selectedModeId);
  
  if (!mode) {
    throw new Error(`Selected mode '${params.selectedModeId}' is invalid or not configured.`);
  }

  return await optimizePrompt({
    rawPrompt: params.rawPrompt,
    systemInstruction: mode.systemInstruction,
    apiKey,
    model: selectedModel,
    length: params.selectedLength,
    onChunk
  });
}

// 1. Connection-oriented Port streaming listener
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'axiom-stream-port') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'OPTIMIZE_PROMPT_STREAM') {
        const { rawPrompt, selectedModeId, selectedLength } = message;
        const { defaultLength = 'medium', selectedModel = 'gemini-3.1-flash-lite' } = await chrome.storage.local.get(['defaultLength', 'selectedModel']);
        const length = selectedLength || defaultLength;

        // Check local session storage cache first (0ms latency optimization)
        const cacheKey = getCacheKey(selectedModel, selectedModeId, length, rawPrompt);
        try {
          const cacheData = await chrome.storage.session.get([cacheKey]);
          if (cacheData[cacheKey]) {
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

            const cachedText = cacheData[cacheKey];
            let accumulated = '';
            // Stream the cached response in fast, elegant, animated packets
            const words = cachedText.split(/(\s+)/);
            for (const word of words) {
              if (word) {
                accumulated += word;
                port.postMessage({ type: 'CHUNK', text: word });
                // Update session state incrementally to support active popup re-open transitions
                await chrome.storage.session.set({ optimizedPrompt: accumulated });
                await new Promise(r => setTimeout(r, 4));
              }
            }

            const successState = {
              status: 'success',
              rawPrompt,
              selectedModeId,
              selectedLength: length,
              optimizedPrompt: cachedText,
              error: null
            };
            await chrome.storage.session.set(successState);
            port.postMessage({ type: 'SUCCESS', state: successState });
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
            selectedModeId,
            selectedLength: length
          }, async (chunk) => {
            accumulated += chunk;
            port.postMessage({ type: 'CHUNK', text: chunk });
            
            // Push incremental tokens to session state so UI can recover mid-generation
            await chrome.storage.session.set({
              status: 'thinking',
              rawPrompt,
              selectedModeId,
              selectedLength: length,
              optimizedPrompt: accumulated,
              error: null
            });
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
          port.postMessage({ type: 'SUCCESS', state: successState });

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
          port.postMessage({ type: 'ERROR', state: errorState });
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
        const { defaultLength = 'medium', selectedModel = 'gemini-3.1-flash-lite' } = await chrome.storage.local.get(['defaultLength', 'selectedModel']);
        const length = message.selectedLength || defaultLength;

        // Check Cache
        const cacheKey = getCacheKey(selectedModel, message.selectedModeId, length, message.rawPrompt);
        const cacheData = await chrome.storage.session.get([cacheKey]);
        if (cacheData[cacheKey]) {
          const successState = {
            status: 'success',
            rawPrompt: message.rawPrompt,
            selectedModeId: message.selectedModeId,
            selectedLength: length,
            optimizedPrompt: cacheData[cacheKey],
            error: null
          };
          await chrome.storage.session.set(successState);
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
});
