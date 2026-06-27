// Axiom Extension Dashboard Bridge Content Script
// Facilitates secure data transfers between the dashboard webpage and chrome.storage.local.

(function () {
  console.log("[Axiom Bridge] Content script initialized on dashboard.");

  // Notify webpage that the extension bridge is active
  window.postMessage({ type: 'AXIOM_EXTENSION_BRIDGE_READY' }, '*');

  window.addEventListener('message', async (event) => {
    // Only accept messages from ourselves (the dashboard page context)
    if (event.source !== window) return;

    if (event.data && event.data.type === 'AXIOM_GET_STORED_DATA') {
      try {
        const data = await chrome.storage.local.get(['promptHistory', 'customModes']);
        window.postMessage({
          type: 'AXIOM_STORED_DATA_RESPONSE',
          success: true,
          promptHistory: data.promptHistory || [],
          customModes: data.customModes || []
        }, '*');
      } catch (e) {
        console.error("[Axiom Bridge] Failed to read storage:", e);
        window.postMessage({
          type: 'AXIOM_STORED_DATA_RESPONSE',
          success: false,
          error: e.message
        }, '*');
      }
    }

    if (event.data && event.data.type === 'AXIOM_SAVE_STORED_DATA') {
      try {
        const { promptHistory, customModes } = event.data;
        const toSet = {};
        if (promptHistory !== undefined) toSet.promptHistory = promptHistory;
        if (customModes !== undefined) toSet.customModes = customModes;
        
        await chrome.storage.local.set(toSet);
        window.postMessage({ type: 'AXIOM_SAVE_DATA_CONFIRMED', success: true }, '*');
      } catch (e) {
        console.error("[Axiom Bridge] Failed to write storage:", e);
        window.postMessage({ type: 'AXIOM_SAVE_DATA_CONFIRMED', success: false, error: e.message }, '*');
      }
    }
  });
})();
