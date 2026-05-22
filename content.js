/* Axiom Inline Prompt Optimizer Content Script */


const GENERIC_SELECTORS = [
  '#prompt-textarea',
  'div.ProseMirror[contenteditable]',
  'textarea.prompt-textarea',
  'textarea#chat-input',
  'textarea[placeholder*="prompt" i]',
  'textarea[placeholder*="Ask me anything" i]',
  'textarea[placeholder*="Message" i]',
  'div[contenteditable]',
  '[contenteditable="plaintext-only"]',
  '[contenteditable="true"]',
  '[contenteditable]',
  '.ql-editor'
];


// Global State Declarations
let floatingWidget = null;
let lastActiveInputEl = null;
let observer = null;
let axiomIntervalId = null;
let isCleanedUp = false;
let dragSignalController = null;

// Check if the extension context is still valid (detects reload/update)
function isContextValid() {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
      return false;
    }
    chrome.runtime.getURL("");
    return true;
  } catch (e) {
    return false;
  }
}

// Gracefully clean up all extension side-effects when context is invalidated
function destroyAxiom() {
  if (isCleanedUp) return;
  isCleanedUp = true;
  
  console.log("[Axiom] Extension context invalidated. Cleaning up listeners, timers, and UI.");
  
  // 1. Disconnect MutationObserver safely
  try {
    if (observer) {
      observer.disconnect();
    }
  } catch (e) {}
  
  // 2. Clear failsafe interval
  try {
    if (axiomIntervalId) {
      clearInterval(axiomIntervalId);
    }
  } catch (e) {}
  
  // 3. Remove floating widget from DOM
  try {
    if (floatingWidget) {
      floatingWidget.remove();
      floatingWidget = null;
    }
  } catch (e) {}
  
  // 4. Clean up focusin listener
  try {
    document.removeEventListener('focusin', handleFocusIn);
  } catch (e) {}

  // 5. Clean up document-level drag listeners using AbortController
  try {
    if (dragSignalController) {
      dragSignalController.abort();
      dragSignalController = null;
    }
  } catch (e) {}
}

// Helper to check if an element is inside a specific tag, crossing shadow boundaries safely
function isInsideElement(el, tagName) {
  try {
    let current = el;
    while (current) {
      if (current.tagName && current.tagName.toLowerCase() === tagName.toLowerCase()) {
        return true;
      }
      const root = current.getRootNode();
      if (root && root.host) {
        current = root.host;
      } else {
        current = current.parentElement;
      }
    }
  } catch (e) {
    console.error("[Axiom] Error in isInsideElement:", e);
  }
  return false;
}

// Validate if a generic input element is a real prompt field
function isValidPromptInput(el) {
  if (!el) return false;
  
  // Return true immediately for highly confident target selectors
  if (
    el.id === 'prompt-textarea' || 
    el.id === 'chat-input' || 
    el.classList.contains('ProseMirror') ||
    el.classList.contains('ql-editor') ||
    isInsideElement(el, 'rich-textarea')
  ) {
    return true;
  }
  
  if (el.tagName === 'TEXTAREA') {
    // Exclude hidden or zero-width textareas
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || el.offsetWidth === 0) {
        return false;
      }
    } catch (e) {}
    return true;
  }
  
  const placeholder = el.getAttribute('placeholder') || '';
  const ariaLabel = el.getAttribute('aria-label') || '';
  const dataPlaceholder = el.getAttribute('data-placeholder') || '';
  
  const keywords = ['prompt', 'ask', 'message', 'chat', 'write', 'enter', 'anything', 'focus on', 'type'];
  const hasKeyword = keywords.some(kw => 
    placeholder.toLowerCase().includes(kw) || 
    ariaLabel.toLowerCase().includes(kw) ||
    dataPlaceholder.toLowerCase().includes(kw)
  );
  
  if (hasKeyword) return true;
  
  return false;
}

// Find all matching inputs, including inside Shadow DOM boundaries recursively (blazing fast)
function findInputs() {
  const inputs = [];
  
  function checkAndAdd(el) {
    if (el && !inputs.includes(el) && isValidPromptInput(el)) {
      inputs.push(el);
    }
  }

  function scan(root) {
    if (!root) return;
    
    // Scan matching selectors in current root
    GENERIC_SELECTORS.forEach(selector => {
      try {
        const els = root.querySelectorAll(selector);
        if (els.length > 0) {
          // Log only once in a while or when input is first detected to avoid spamming
          if (!window._axiomLoggedSelectors) window._axiomLoggedSelectors = new Set();
          if (!window._axiomLoggedSelectors.has(selector)) {
            console.log(`[Axiom] Selector '${selector}' matched element:`, els[0]);
            window._axiomLoggedSelectors.add(selector);
          }
        }
        els.forEach(checkAndAdd);
      } catch (e) {}
    });
    
    // Find all elements that might have shadow roots in this root
    try {
      const elements = root.querySelectorAll('*');
      elements.forEach(el => {
        if (el.shadowRoot) {
          scan(el.shadowRoot);
        }
      });
    } catch (e) {}
  }
  
  try {
    scan(document);
  } catch (e) {
    console.error("[Axiom] Error in findInputs scanning:", e);
  }
  
  return inputs;
}


// Dispatch robust framework event sequence
function dispatchInputEvents(inputEl) {
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  inputEl.dispatchEvent(inputEvent);

  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  inputEl.dispatchEvent(changeEvent);

  // Bypass React Virtual DOM value tracking overrides
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(inputEl, inputEl.value);
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  const keydownEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Process' });
  inputEl.dispatchEvent(keydownEvent);
  const keyupEvent = new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Process' });
  inputEl.dispatchEvent(keyupEvent);

  inputEl.focus();
}

// Replaces input/contenteditable value using execCommand for perfect state synchronization
function replaceInputValue(inputEl, newValue) {
  inputEl.focus();
  
  // Try high-fidelity document.execCommand first (updates React state & Undo history natively)
  try {
    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.select();
    } else {
      const range = document.createRange();
      range.selectNodeContents(inputEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    const success = document.execCommand('insertText', false, newValue);
    if (success) {
      dispatchInputEvents(inputEl);
      return;
    }
  } catch (e) {
    console.warn("execCommand failed, falling back to direct value injection:", e);
  }
  
  // Direct DOM backup replacement
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = newValue;
  } else {
    inputEl.innerText = newValue;
  }
  
  dispatchInputEvents(inputEl);
}

// Safely move text cursor selection to the end of input
function setCursorToEnd(el) {
  el.focus();
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    el.selectionStart = el.selectionEnd = el.value.length;
  } else if (window.getSelection && document.createRange) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// Track the last focused input field safely
function handleFocusIn(e) {
  if (!isContextValid()) {
    destroyAxiom();
    return;
  }
  const target = e.target;
  if (target && isValidPromptInput(target)) {
    lastActiveInputEl = target;
  }
}
document.addEventListener('focusin', handleFocusIn);

// Helper to find the target input for optimization
function getTargetInput() {
  // 1. Check if the currently focused element is valid
  if (document.activeElement && isValidPromptInput(document.activeElement)) {
    return document.activeElement;
  }
  // 2. Check if we have a last active input recorded
  if (lastActiveInputEl && document.body.contains(lastActiveInputEl)) {
    return lastActiveInputEl;
  }
  // 3. Fallback to the first found input on the page
  const inputs = findInputs();
  if (inputs.length > 0) {
    return inputs[0];
  }
  return null;
}

// Make the widget container draggable with mouse/touch bounds-safe interaction
function makeDraggable(container) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;
  let hasMoved = false;

  if (!isContextValid()) {
    destroyAxiom();
    return;
  }

  // Setup AbortController for mousemove/mouseup and touchmove/touchend listeners
  if (dragSignalController) {
    try {
      dragSignalController.abort();
    } catch (e) {}
  }
  dragSignalController = new AbortController();

  // Restore saved coordinates safely
  try {
    chrome.storage.local.get(['widgetLeft', 'widgetTop'], (data) => {
      if (!isContextValid()) {
        destroyAxiom();
        return;
      }
      if (chrome.runtime.lastError) {
        console.warn("[Axiom] Error restoring coordinates:", chrome.runtime.lastError.message);
        return;
      }
      if (data && data.widgetLeft && data.widgetTop) {
        const left = parseFloat(data.widgetLeft);
        const top = parseFloat(data.widgetTop);
        const margin = 10;
        
        // Bounds checking to make sure it's within the current screen viewport bounds
        if (isNaN(left) || left < 0 || left > window.innerWidth - margin ||
            isNaN(top) || top < 0 || top > window.innerHeight - margin) {
          container.style.bottom = '120px';
          container.style.right = '32px';
          container.style.left = 'auto';
          container.style.top = 'auto';
        } else {
          container.style.left = data.widgetLeft;
          container.style.top = data.widgetTop;
          container.style.bottom = 'auto';
          container.style.right = 'auto';
        }
      } else {
        // Default initial position floating on the bottom right
        container.style.bottom = '120px';
        container.style.right = '32px';
        container.style.left = 'auto';
        container.style.top = 'auto';
      }
    });
  } catch (e) {
    destroyAxiom();
  }

  const onStart = (clientX, clientY) => {
    isDragging = true;
    hasMoved = false;
    
    // Get current bounding rectangle to switch to left/top positioning
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    container.style.left = `${initialLeft}px`;
    container.style.top = `${initialTop}px`;
    container.style.bottom = 'auto';
    container.style.right = 'auto';

    startX = clientX;
    startY = clientY;
  };

  const onMove = (clientX, clientY) => {
    if (!isDragging) return;
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMoved = true;
    }
    
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;
    
    // Restrict within window boundaries with safety margin
    const rect = container.getBoundingClientRect();
    const margin = 10;
    
    newLeft = Math.max(margin, Math.min(newLeft, window.innerWidth - rect.width - margin));
    newTop = Math.max(margin, Math.min(newTop, window.innerHeight - rect.height - margin));
    
    container.style.left = `${newLeft}px`;
    container.style.top = `${newTop}px`;
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    
    if (hasMoved) {
      if (!isContextValid()) {
        destroyAxiom();
        return;
      }
      try {
        // Save final coordinates to persistence safely
        chrome.storage.local.set({
          widgetLeft: container.style.left,
          widgetTop: container.style.top
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn("[Axiom] Error saving coordinates:", chrome.runtime.lastError.message);
          }
        });
      } catch (e) {
        destroyAxiom();
      }
    }
  };

  // Mouse events
  container.addEventListener('mousedown', (e) => {
    // Only drag with left-click, and don't drag if clicking buttons inside the widget
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    onStart(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e) => {
    onMove(e.clientX, e.clientY);
  }, { signal: dragSignalController.signal });

  document.addEventListener('mouseup', () => {
    onEnd();
  }, { signal: dragSignalController.signal });

  // Touch events for mobile/tablet screens
  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    onStart(touch.clientX, touch.clientY);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    onMove(touch.clientX, touch.clientY);
  }, { passive: true, signal: dragSignalController.signal });

  document.addEventListener('touchend', () => {
    onEnd();
  }, { signal: dragSignalController.signal });
}

// Unified function to handle streaming prompt optimization
async function handlePromptOptimization(inputEl, buttonEl, containerEl) {
  if (!inputEl) return;

  if (!isContextValid()) {
    destroyAxiom();
    alert("Axiom: The extension has been updated or reloaded. Please refresh the page to continue using Axiom.");
    return;
  }

  const textVal = inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT'
    ? inputEl.value.trim()
    : (inputEl.innerText || inputEl.textContent).trim();
    
  if (!textVal) {
    alert("Axiom: Please enter a prompt to optimize first!");
    return;
  }
  
  // Read local credentials and configuration safely
  let storageData = {};
  try {
    storageData = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['apiKey', 'lastActiveModeId', 'selectedLength', 'defaultLength'], (data) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(data);
        }
      });
    });
  } catch (e) {
    destroyAxiom();
    alert("Axiom: The extension has been updated or reloaded. Please refresh the page to continue using Axiom.");
    return;
  }

  const { apiKey = '', lastActiveModeId = 'analyst', selectedLength = '', defaultLength = 'medium' } = storageData;
  const activeLength = selectedLength || defaultLength;
  
  if (!apiKey) {
    alert("Axiom: Please configure your Gemini API Key in the extension popup settings first!");
    return;
  }
  
  // Set active loader visual states (class-based premium transitions)
  if (buttonEl) buttonEl.disabled = true;
  if (containerEl) containerEl.classList.add('loading');
  if (buttonEl) {
    const btnText = buttonEl.querySelector('.axiom-btn-text');
    if (btnText) btnText.textContent = 'Optimizing...';
  }
  
  let accumulatedText = '';
  
  // Establish port connection to background streaming worker safely
  let port;
  try {
    port = chrome.runtime.connect({ name: 'axiom-stream-port' });
  } catch (e) {
    destroyAxiom();
    alert("Axiom: The extension has been updated or reloaded. Please refresh the page to continue using Axiom.");
    return;
  }
  
  let isCleanedUpPort = false;
  const cleanup = () => {
    if (isCleanedUpPort) return;
    isCleanedUpPort = true;
    
    if (buttonEl) buttonEl.disabled = false;
    if (containerEl) containerEl.classList.remove('loading');
    if (buttonEl) {
      const btnText = buttonEl.querySelector('.axiom-btn-text');
      if (btnText) btnText.textContent = 'Optimize Prompt';
    }
    try {
      port.disconnect();
    } catch (e) {}
  };
  
  try {
    port.postMessage({
      type: 'OPTIMIZE_PROMPT_STREAM',
      rawPrompt: textVal,
      selectedModeId: lastActiveModeId,
      selectedLength: activeLength
    });
    
    port.onMessage.addListener((response) => {
      if (!isContextValid()) {
        cleanup();
        destroyAxiom();
        return;
      }
      if (response.type === 'CHUNK') {
        accumulatedText += response.text;
        
        // Rewrite active input field incrementally in real time
        replaceInputValue(inputEl, accumulatedText);
        setCursorToEnd(inputEl);
      } else if (response.type === 'SUCCESS') {
        // Final commits and cursor relocation
        replaceInputValue(inputEl, response.state.optimizedPrompt);
        setCursorToEnd(inputEl);
        cleanup();
      } else if (response.type === 'ERROR') {
        const errorMsg = response.state?.error || 'Unknown error occurred during optimization.';
        alert(`Axiom Optimization Error: ${errorMsg}`);
        cleanup();
      }
    });
    
    port.onDisconnect.addListener(() => {
      console.log("[Axiom Inline Widget] Port stream disconnected.");
      cleanup();
    });
  } catch (e) {
    cleanup();
  }
}

// Sets up button event listener and optimization API pipeline trigger
function setupButtonListener(button, container) {
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const inputEl = getTargetInput();
    if (!inputEl) {
      alert("Axiom: Please focus on or type inside a prompt input box first!");
      return;
    }
    
    handlePromptOptimization(inputEl, button, container);
  });
}

// Create the single beautiful glassmorphic floating widget
function createFloatingWidget() {
  if (floatingWidget) return;
  
  const container = document.createElement('div');
  container.className = 'axiom-floating-container';
  
  // Drag handle indicator
  const dragHandle = document.createElement('div');
  dragHandle.className = 'axiom-drag-handle';
  dragHandle.innerHTML = '⋮⋮';
  dragHandle.title = 'Drag to reposition widget';
  container.appendChild(dragHandle);
  
  // Optimization trigger button
  const button = document.createElement('button');
  button.className = 'axiom-optimize-btn';
  button.setAttribute('type', 'button');
  button.innerHTML = `
    <span class="axiom-sparkle">✨</span>
    <span class="axiom-btn-text">Optimize Prompt</span>
  `;
  container.appendChild(button);
  
  // Append directly to body to completely bypass nested layout clipping
  document.body.appendChild(container);
  floatingWidget = container;
  
  // Set up dragging and click action
  makeDraggable(container);
  setupButtonListener(button, container);
}

// Scans page and makes sure the floating widget is displayed only when chat inputs exist
// Scans page and makes sure the floating widget is displayed when chat inputs exist or when forced by settings
function scanAndInject() {
  if (!isContextValid()) {
    destroyAxiom();
    return;
  }
  
  try {
    chrome.storage.local.get(['showWidgetAlways'], (data) => {
      if (!isContextValid()) {
        destroyAxiom();
        return;
      }
      
      const showAlways = data && data.showWidgetAlways === true;
      const inputs = findInputs();
      
      if (showAlways || inputs.length > 0) {
        if (!floatingWidget) {
          createFloatingWidget();
        } else {
          floatingWidget.style.display = 'flex';
        }
      } else {
        if (floatingWidget) {
          floatingWidget.style.display = 'none';
        }
      }
    });
  } catch (e) {
    destroyAxiom();
  }
}

// 1. Setup live DOM tree MutationObserver safely
observer = new MutationObserver((mutations) => {
  scanAndInject();
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// 2. Failsafe Interval scanner
axiomIntervalId = setInterval(scanAndInject, 1500);

// 3. Initial document scanner call
scanAndInject();

// 4. Reactive storage listener for configuration & position synchronization
try {
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (!isContextValid()) {
          destroyAxiom();
          return;
        }
        
        // Handle widget position reset
        if (changes.widgetLeft && !changes.widgetLeft.newValue && floatingWidget) {
          floatingWidget.style.bottom = '120px';
          floatingWidget.style.right = '32px';
          floatingWidget.style.left = 'auto';
          floatingWidget.style.top = 'auto';
        }
        
        // Handle visibility toggles
        if (changes.showWidgetAlways) {
          scanAndInject();
        }
      }
    });
  }
} catch (e) {
  console.warn("[Axiom] Failed to initialize dynamic storage change listener:", e);
}

console.log("[Axiom] Extension Content Script successfully loaded and scanning started!");

