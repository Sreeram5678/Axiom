document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyContainer = document.getElementById('api-key-container');
  const secureState = document.getElementById('secure-state');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const updateKeyBtn = document.getElementById('update-key-btn');
  
  // Floating widget settings elements
  const showAlwaysCheckbox = document.getElementById('show-always-checkbox');
  const resetPositionBtn = document.getElementById('reset-position-btn');

  try {
    // Check if key already exists, and retrieve showWidgetAlways setting
    const { apiKey = '', showWidgetAlways = false } = await chrome.storage.local.get(['apiKey', 'showWidgetAlways']);
    
    if (apiKey) {
      showSecureState();
    } else {
      showInputState();
    }
    
    // Set initial checkbox state
    if (showAlwaysCheckbox) {
      showAlwaysCheckbox.checked = showWidgetAlways;
    }
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

  function showSecureState() {
    apiKeyContainer.style.display = 'none';
    secureState.style.display = 'flex';
  }

  function showInputState() {
    apiKeyContainer.style.display = 'flex';
    secureState.style.display = 'none';
  }
});
