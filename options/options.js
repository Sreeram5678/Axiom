document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyContainer = document.getElementById('api-key-container');
  const secureState = document.getElementById('secure-state');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const updateKeyBtn = document.getElementById('update-key-btn');

  try {
    // Check if key already exists
    const { apiKey = '' } = await chrome.storage.local.get(['apiKey']);
    
    if (apiKey) {
      showSecureState();
    } else {
      showInputState();
    }
  } catch (err) {
    console.warn("[Axiom Options] Failed to retrieve API key:", err.message);
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

  function showSecureState() {
    apiKeyContainer.style.display = 'none';
    secureState.style.display = 'flex';
  }

  function showInputState() {
    apiKeyContainer.style.display = 'flex';
    secureState.style.display = 'none';
  }
});
