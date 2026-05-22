import { encrypt, decrypt } from '../modules/crypto-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyContainer = document.getElementById('api-key-container');
  const secureState = document.getElementById('secure-state');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const updateKeyBtn = document.getElementById('update-key-btn');
  
  // Floating widget settings elements
  const showAlwaysCheckbox = document.getElementById('show-always-checkbox');
  const resetPositionBtn = document.getElementById('reset-position-btn');

  // AI Routing elements
  const aiRoutingSelect = document.getElementById('ai-routing-select');
  const ramTip = document.getElementById('ram-tip');

  // Zero-Knowledge Sync elements
  const syncStatusBadge = document.getElementById('sync-status-badge');
  const syncPassphraseInput = document.getElementById('sync-passphrase-input');
  const syncPassphraseWrapper = document.getElementById('sync-passphrase-wrapper');
  const enableSyncBtn = document.getElementById('enable-sync-btn');
  const disableSyncBtn = document.getElementById('disable-sync-btn');

  try {
    // Check if key already exists, retrieve showWidgetAlways & aiRoutingMode setting
    const { apiKey = '', showWidgetAlways = false, aiRoutingMode = 'hybrid' } = await chrome.storage.local.get(['apiKey', 'showWidgetAlways', 'aiRoutingMode']);
    
    if (apiKey) {
      showSecureState();
    } else {
      showInputState();
    }
    
    // Set initial checkbox state
    if (showAlwaysCheckbox) {
      showAlwaysCheckbox.checked = showWidgetAlways;
    }

    // Set initial routing select state
    if (aiRoutingSelect) {
      aiRoutingSelect.value = aiRoutingMode;
    }

    // 8GB RAM Tip detection
    if (ramTip) {
      if (navigator.deviceMemory && navigator.deviceMemory <= 8) {
        ramTip.textContent = "(8GB RAM detected — Hybrid Auto-Routing recommended)";
        ramTip.style.display = "block";
      } else {
        ramTip.style.display = "none";
      }
    }

    // Render Sync UI
    await renderSyncUI();

  } catch (err) {
    console.warn("[Axiom Options] Failed to retrieve settings:", err.message);
    showInputState();
  }

  saveKeyBtn.addEventListener('click', async () => {
    try {
      const rawKey = apiKeyInput.value.trim();
      if (!rawKey) {
        alert("Please enter a valid API key.");
        return;
      }

      await chrome.storage.local.set({ apiKey: rawKey });
      apiKeyInput.value = ''; // Clear input immediately for security
      showSecureState();

      // If sync is active, immediately encrypt and update the sync backup
      const localData = await chrome.storage.local.get(['syncPassphrase']);
      if (localData.syncPassphrase) {
        await encryptAndSyncProfile(localData.syncPassphrase);
      }
    } catch (err) {
      console.warn("[Axiom Options] Failed to save API key:", err.message);
      alert("Failed to save API key: " + err.message);
    }
  });

  updateKeyBtn.addEventListener('click', () => {
    showInputState();
    apiKeyInput.focus();
  });

  // Save "showWidgetAlways" toggle value dynamically on change
  if (showAlwaysCheckbox) {
    showAlwaysCheckbox.addEventListener('change', async (e) => {
      try {
        await chrome.storage.local.set({ showWidgetAlways: e.target.checked });
      } catch (err) {
        console.warn("[Axiom Options] Failed to save showWidgetAlways toggle:", err.message);
      }
    });
  }

  // Save "aiRoutingMode" dynamically on change
  if (aiRoutingSelect) {
    aiRoutingSelect.addEventListener('change', async (e) => {
      try {
        const val = e.target.value;
        await chrome.storage.local.set({ aiRoutingMode: val });

        // If sync is active, immediately encrypt and update the sync backup
        const localData = await chrome.storage.local.get(['syncPassphrase']);
        if (localData.syncPassphrase) {
          await encryptAndSyncProfile(localData.syncPassphrase);
        }
      } catch (err) {
        console.warn("[Axiom Options] Failed to save aiRoutingMode:", err.message);
      }
    });
  }

  // Reset floating button's position coordinates in storage
  if (resetPositionBtn) {
    resetPositionBtn.addEventListener('click', async () => {
      try {
        await chrome.storage.local.remove(['widgetLeft', 'widgetTop']);
        
        // Visual confirmation feedback
        const originalText = resetPositionBtn.textContent;
        resetPositionBtn.textContent = 'Position Reset Successfully!';
        resetPositionBtn.style.borderColor = 'var(--success-color)';
        resetPositionBtn.style.color = 'var(--success-color)';
        
        setTimeout(() => {
          resetPositionBtn.textContent = originalText;
          resetPositionBtn.style.borderColor = '';
          resetPositionBtn.style.color = '';
        }, 2000);
      } catch (err) {
        console.warn("[Axiom Options] Failed to reset widget position:", err.message);
        alert("Failed to reset position: " + err.message);
      }
    });
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

  // Bind Sync Enable/Decrypt Button
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
            
            // Reload page to reflect new settings
            window.location.reload();
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

  // Bind Sync Disable Button
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

  // Listen to external/background storage sync changes and auto-update
  try {
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'local' || areaName === 'sync') {
        await renderSyncUI();
        
        // If API key changed locally, adjust input state
        if (changes.apiKey) {
          if (changes.apiKey.newValue) {
            showSecureState();
          } else {
            showInputState();
          }
        }
      }
    });
  } catch (e) {
    console.warn("[Axiom Options] Storage changed listener failure:", e);
  }

  function showSecureState() {
    apiKeyContainer.style.display = 'none';
    secureState.style.display = 'flex';
  }

  function showInputState() {
    apiKeyContainer.style.display = 'flex';
    secureState.style.display = 'none';
  }
});
