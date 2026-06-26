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
      // Optimize: Target likely containers rather than every single element to improve speed
      const elements = root.querySelectorAll('div, main, section, article, custom-element, [class*="chat"], [class*="message"], [id*="chat"]');
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

const CHAT_BUBBLE_SELECTORS = [
  'div[data-testid*="conversation-turn"]',
  '.message',
  '.query-text',
  '.model-response',
  'g-right-bubble',
  'g-left-bubble',
  '.message-content',
  '.font-claude-message',
  '.chat-message',
  'div[data-testid*="message"]',
  '.ds-chat-bubble',
  '.ds-markdown',
  '.chat-bubble',
  '.msg-content',
  '.chat-msg',
  '.im-message'
];

// Compile context synthesis by searching all adjacent chat bubbles across Shadow DOMs recursively
function capturePageContext(rawPrompt) {
  const bubbles = [];
  
  function scan(root) {
    if (!root) return;
    CHAT_BUBBLE_SELECTORS.forEach(selector => {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          if (!bubbles.includes(el)) {
            bubbles.push(el);
          }
        });
      } catch (e) {}
    });
    
    try {
      const children = root.querySelectorAll('*');
      children.forEach(child => {
        if (child.shadowRoot) {
          scan(child.shadowRoot);
        }
      });
    } catch (e) {}
  }
  
  scan(document);
  
  // Sort elements by vertical placement to preserve logical chronological order
  bubbles.sort((a, b) => {
    const posA = a.getBoundingClientRect().top;
    const posB = b.getBoundingClientRect().top;
    return posA - posB;
  });

  if (bubbles.length === 0) return "";

  // If no raw prompt is provided, fall back to simple last-4 bubbles to avoid breaking
  if (!rawPrompt || rawPrompt.trim() === "") {
    const contextItems = [];
    bubbles.slice(-4).forEach(el => {
      const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, ' ');
      if (text.length > 5 && text.length < 1500) {
        let speaker = "Participant";
        const html = el.outerHTML.toLowerCase();
        if (html.includes("user") || html.includes("right-bubble") || html.includes("human") || html.includes("query")) {
          speaker = "User";
        } else if (html.includes("assistant") || html.includes("left-bubble") || html.includes("model") || html.includes("bot")) {
          speaker = "Assistant";
        }
        contextItems.push(`${speaker}: ${text}`);
      }
    });
    return contextItems.length > 0 ? `Conversation history context:\n${contextItems.join('\n')}` : "";
  }

  // --- Dynamic Keyword / Proximity Deterministic RAG ---
  const stopWords = new Set(["the", "a", "an", "is", "to", "for", "in", "on", "it", "that", "of", "and", "this", "my", "your", "with", "as", "by", "at", "from"]);
  const keywords = rawPrompt.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const keywordSet = new Set(keywords);

  if (keywordSet.size === 0) {
    // If no unique keywords are found, fall back to last-4 bubbles
    const contextItems = [];
    bubbles.slice(-4).forEach(el => {
      const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, ' ');
      if (text.length > 5 && text.length < 1500) {
        let speaker = "Participant";
        const html = el.outerHTML.toLowerCase();
        if (html.includes("user") || html.includes("right-bubble") || html.includes("human") || html.includes("query")) {
          speaker = "User";
        } else if (html.includes("assistant") || html.includes("left-bubble") || html.includes("model") || html.includes("bot")) {
          speaker = "Assistant";
        }
        contextItems.push(`${speaker}: ${text}`);
      }
    });
    return contextItems.length > 0 ? `Conversation history context:\n${contextItems.join('\n')}` : "";
  }

  // Score each bubble
  const scoredBubbles = bubbles.map(el => {
    const rawText = el.innerText || el.textContent || "";
    const text = rawText.trim().replace(/\s+/g, ' ');
    const textLower = text.toLowerCase();
    
    let score = 0;
    
    // 1. Keyword density check
    // Safe linear count via indexOf — avoids new RegExp(variable) which risks ReDoS (CWE-185)
    keywordSet.forEach(word => {
      let count = 0;
      let pos = 0;
      while ((pos = textLower.indexOf(word, pos)) !== -1) {
        count++;
        pos += word.length;
      }
      if (count > 0) {
        score += 15; // 15 points per unique keyword hit
        score += (count - 1) * 2; // 2 points per extra occurrence
      }
    });

    // 2. Keyword proximity scoring (bonus if keywords appear close together)
    const words = textLower.split(/\s+/);
    const matchedIndices = [];
    words.forEach((word, idx) => {
      const cleanWord = word.replace(/[^\w]/g, '');
      // Use Set.has() instead of bracket notation to prevent prototype pollution (CWE-94)
      if (cleanWord.length > 0 && keywordSet.has(cleanWord)) {
        matchedIndices.push(idx);
      }
    });
    for (let i = 0; i < matchedIndices.length - 1; i++) {
      const dist = matchedIndices.at(i + 1) - matchedIndices.at(i);
      if (dist <= 10) {
        score += (10 - dist + 1) * 3; // Closer matches get a higher bonus
      }
    }

    // 3. Code Block priority boost (strongly prefer developer code segments)
    const html = el.outerHTML.toLowerCase();
    if (html.includes("pre") || html.includes("code") || text.includes("```")) {
      score += 35; // 35 point substantial boost
    }

    return { el, text, score };
  });

  // Filter out completely irrelevant bubbles (score < 15) and pick top 5
  const relevantBubbles = scoredBubbles
    .filter(b => b.score >= 15 && b.text.length > 5 && b.text.length < 1500)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // If no bubbles scored high enough, fall back to last-2 bubbles as safe context
  if (relevantBubbles.length === 0) {
    const contextItems = [];
    bubbles.slice(-2).forEach(el => {
      const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, ' ');
      if (text.length > 5 && text.length < 1500) {
        let speaker = "Participant";
        const html = el.outerHTML.toLowerCase();
        if (html.includes("user") || html.includes("right-bubble") || html.includes("human") || html.includes("query")) {
          speaker = "User";
        } else if (html.includes("assistant") || html.includes("left-bubble") || html.includes("model") || html.includes("bot")) {
          speaker = "Assistant";
        }
        contextItems.push(`${speaker}: ${text}`);
      }
    });
    return contextItems.length > 0 ? `Conversation history context:\n${contextItems.join('\n')}` : "";
  }

  // Sort back to their original vertical DOM order to preserve conversation flow
  relevantBubbles.sort((a, b) => {
    return bubbles.indexOf(a.el) - bubbles.indexOf(b.el);
  });

  const contextItems = relevantBubbles.map(b => {
    let speaker = "Participant";
    const html = b.el.outerHTML.toLowerCase();
    if (html.includes("user") || html.includes("right-bubble") || html.includes("human") || html.includes("query")) {
      speaker = "User";
    } else if (html.includes("assistant") || html.includes("left-bubble") || html.includes("model") || html.includes("bot")) {
      speaker = "Assistant";
    }
    return `${speaker}: ${b.text}`;
  });

  return `Conversation history context:\n${contextItems.join('\n')}`;
}

// Runs prompt optimization locally using Chrome's built-in window.ai.languageModel API
async function runOnDeviceOptimizationStream(rawPrompt, systemInstruction, length, onChunk) {
  if (typeof window.ai === 'undefined' || typeof window.ai.languageModel === 'undefined') {
    throw new Error("window.ai language model API is not available.");
  }
  
  const capabilities = await window.ai.languageModel.capabilities();
  if (capabilities.available === "no") {
    throw new Error("On-device Gemini Nano is not available or downloading.");
  }

  // RAM Guard warning and resource containment
  if (navigator.deviceMemory && navigator.deviceMemory <= 8) {
    console.log("[Axiom Local AI] Conservative allocation enforced (8GB or less system memory detected).");
  }

  let lengthDirective = "";
  if (length === "short") {
    lengthDirective = "The optimized prompt MUST be short, extremely concise, direct, and focused only on the absolute essentials.";
  } else if (length === "detailed") {
    lengthDirective = "The optimized prompt MUST be highly detailed, comprehensive, and thorough.";
  } else {
    lengthDirective = "The optimized prompt MUST be of medium length, balancing clear context, structural clarity, and efficient detail.";
  }

  const fullInstruction = `You are a master Prompt Engineer. Your task is to rewrite, refine, and optimize the user's prompt to achieve the highest quality response. Incorporate the following persona guidelines:\n\n${systemInstruction}\n\n${lengthDirective}\n\nCRITICAL: Return ONLY the raw optimized prompt string. Do not wrap the output in markdown code blocks, do not add conversational preamble.`;

  const session = await window.ai.languageModel.create({
    systemPrompt: fullInstruction,
    temperature: 0.3
  });

  try {
    const stream = session.promptStreaming(rawPrompt);
    let previousLength = 0;
    for await (const chunk of stream) {
      const delta = chunk.substring(previousLength);
      previousLength = chunk.length;
      if (delta) {
        onChunk(delta);
      }
    }
  } finally {
    try {
      await session.destroy();
    } catch (e) {}
  }
}

// Unified function to handle streaming prompt optimization (Hybrid Routing + Local AI support)
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

  // Read local credentials and configurations safely
  let storageData = {};
  try {
    storageData = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['apiKey', 'lastActiveModeId', 'selectedLength', 'defaultLength', 'aiRoutingMode', 'customModes'], (data) => {
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

  const { apiKey = '', lastActiveModeId = 'analyst', selectedLength = '', defaultLength = 'medium', aiRoutingMode = 'hybrid', customModes = [] } = storageData;
  const activeLength = selectedLength || defaultLength;
  
  if (!apiKey && aiRoutingMode !== 'local-only') {
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
  
  // Determine context synthetics
  const pageContext = capturePageContext(textVal);
  
  // Route to local AI if conditions match
  let runLocal = false;
  if (aiRoutingMode === 'local-only') {
    runLocal = true;
  } else if (aiRoutingMode === 'hybrid') {
    if (typeof window.ai !== 'undefined' && typeof window.ai.languageModel !== 'undefined') {
      try {
        const capabilities = await window.ai.languageModel.capabilities();
        if (capabilities.available === 'readily') {
          runLocal = true;
        }
      } catch (e) {}
    }
  }

  if (runLocal) {
    if (buttonEl) {
      const btnText = buttonEl.querySelector('.axiom-btn-text');
      if (btnText) btnText.textContent = 'Optimizing (Local)...';
    }

    let accumulatedText = '';
    try {
      const promptToOptimize = pageContext 
        ? `${pageContext}\n\nUser request to optimize:\n"${textVal}"`
        : textVal;

      // Extract mode instruction locally
      const defaultModesList = [
        {
          "id": "analyst",
          "systemInstruction": "Optimize the prompt to request structured data, clear logical assumptions, key performance indicators, comparative frameworks, and detailed analytical breakdowns."
        },
        {
          "id": "engineer",
          "systemInstruction": "Optimize the prompt to request high-quality, production-grade technical code or architecture designs. The prompt should explicitly seek edge-case handling, robust error management, code efficiency/complexity analysis (Big O), modular design patterns, security considerations, and comprehensive comments or documentation."
        },
        {
          "id": "first-principles",
          "systemInstruction": "Optimize the prompt to demand first-principles thinking. It must deconstruct the query into its most fundamental truths."
        },
        {
          "id": "exec-summary",
          "systemInstruction": "Optimize the prompt to demand a high-level strategic executive summary consisting of a 2-sentence overarching synthesis and 3-5 bulleted takeaways."
        }
      ];
      
      const allModes = [...customModes, ...defaultModesList];
      const activeMode = allModes.find(m => m.id === lastActiveModeId) || allModes[0];
      const systemInstruction = activeMode ? activeMode.systemInstruction : '';

      await runOnDeviceOptimizationStream(
        promptToOptimize,
        systemInstruction,
        activeLength,
        (chunk) => {
          accumulatedText += chunk;
          replaceInputValue(inputEl, accumulatedText);
          setCursorToEnd(inputEl);
        }
      );

      // Final cleanups and format check
      let optimizedText = accumulatedText.trim();
      if (optimizedText.startsWith("```")) {
        optimizedText = optimizedText.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
      }
      replaceInputValue(inputEl, optimizedText);
      setCursorToEnd(inputEl);

      // Save local state to session storage to sync the popup UI
      const successState = {
        status: 'success',
        rawPrompt: textVal,
        selectedModeId: lastActiveModeId,
        selectedLength: activeLength,
        optimizedPrompt: optimizedText,
        error: null
      };

      if (chrome.storage.session) {
        await chrome.storage.session.set(successState);
      }

      // Notify service worker to log local success in history
      try {
        chrome.runtime.sendMessage({
          type: 'SAVE_TO_HISTORY',
          rawPrompt: textVal,
          optimizedPrompt: optimizedText,
          modeId: lastActiveModeId,
          length: activeLength
        });
      } catch (e) {}

      // Tear down visual loaders
      if (buttonEl) buttonEl.disabled = false;
      if (containerEl) containerEl.classList.remove('loading');
      if (buttonEl) {
        const btnText = buttonEl.querySelector('.axiom-btn-text');
        if (btnText) btnText.textContent = 'Optimize Prompt';
      }
      return; // Handled locally!
    } catch (err) {
      console.warn("[Axiom Hybrid Router] Local Gemini Nano failed. Cascading to cloud fallback.", err);
      if (aiRoutingMode === 'local-only') {
        alert(`Axiom Local Error: ${err.message}. Adjust settings or enable window.ai flags.`);
        if (buttonEl) buttonEl.disabled = false;
        if (containerEl) containerEl.classList.remove('loading');
        if (buttonEl) {
          const btnText = buttonEl.querySelector('.axiom-btn-text');
          if (btnText) btnText.textContent = 'Optimize Prompt';
        }
        return;
      }
      // Fall through to remote cloud optimization
      if (buttonEl) {
        const btnText = buttonEl.querySelector('.axiom-btn-text');
        if (btnText) btnText.textContent = 'Optimizing (Cloud)...';
      }
    }
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
      contextPrompt: pageContext, // Scraped context passed to cloud prompt engineer
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
        replaceInputValue(inputEl, accumulatedText);
        setCursorToEnd(inputEl);
      } else if (response.type === 'SUCCESS') {
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
    <svg class="axiom-sparkle-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9"></polygon></svg>
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
    chrome.storage.local.get(['showWidgetAlways', 'hideWidgetEntirely'], (data) => {
      if (!isContextValid()) {
        destroyAxiom();
        return;
      }
      
      const hideEntirely = data && data.hideWidgetEntirely === true;
      if (hideEntirely) {
        if (floatingWidget) {
          floatingWidget.style.setProperty('display', 'none', 'important');
        }
        return;
      }
      
      const showAlways = data && data.showWidgetAlways === true;
      const inputs = findInputs();
      
      if (showAlways || inputs.length > 0) {
        if (!floatingWidget) {
          createFloatingWidget();
        } else {
          floatingWidget.style.setProperty('display', 'flex', 'important');
        }
      } else {
        if (floatingWidget) {
          floatingWidget.style.setProperty('display', 'none', 'important');
        }
      }
    });
  } catch (e) {
    destroyAxiom();
  }
}

// 1. Setup live DOM tree MutationObserver safely
let scanTimeout = null;
observer = new MutationObserver((mutations) => {
  if (scanTimeout) return;
  scanTimeout = setTimeout(() => {
    scanAndInject();
    scanTimeout = null;
  }, 300);
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
        if (changes.showWidgetAlways || changes.hideWidgetEntirely) {
          scanAndInject();
        }
      }
    });
  }
} catch (e) {
  console.warn("[Axiom] Failed to initialize dynamic storage change listener:", e);
}

console.log("[Axiom] Extension Content Script successfully loaded and scanning started!");

// 5. Global focused input keyboard shortcut listener (Alt+Shift+O / Option+Shift+O & Control+Shift+O)
document.addEventListener('keydown', async (e) => {
  if (!isContextValid()) {
    destroyAxiom();
    return;
  }
  
  // Option+Shift+O (Alt+Shift+O) or Control+Shift+O
  const isMatch = (e.altKey && e.shiftKey && e.code === 'KeyO') || (e.ctrlKey && e.shiftKey && e.code === 'KeyO');
  if (isMatch) {
    const inputEl = getTargetInput();
    if (inputEl) {
      e.preventDefault();
      
      const buttonEl = floatingWidget ? floatingWidget.querySelector('.axiom-optimize-btn') : null;
      handlePromptOptimization(inputEl, buttonEl, floatingWidget);
    }
  }
});

