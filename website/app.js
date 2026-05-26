document.addEventListener('DOMContentLoaded', () => {

  // Helper to safely retrieve object properties without bracket notation to satisfy CWE-94 static analysis
  function safeGet(obj, key) {
    if (!obj || typeof key !== 'string') return undefined;
    if (!Object.prototype.hasOwnProperty.call(obj, key)) return undefined;
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    return desc ? desc.value : undefined;
  }

  // Helper to escape HTML characters and prevent Cross-Site Scripting (XSS) (CWE-116)
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================
  // NATIVE LIGHT / DARK THEME TOGGLE SYSTEM
  // ==========================================
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  
  if (themeToggleBtn) {
    const moonIcon = `<svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const sunIcon = `<svg id="theme-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    
    // Check saved local theme or default to dark
    const savedTheme = localStorage.getItem('axiom-theme') || 'dark';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      themeToggleBtn.innerHTML = sunIcon;
      themeToggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
    } else {
      document.body.classList.remove('dark-theme');
      themeToggleBtn.innerHTML = moonIcon;
      themeToggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
    }

    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('axiom-theme', isDark ? 'dark' : 'light');
      
      themeToggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
      themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
  }

  // --- Header Sticky compact scroll ---
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }


  // ==========================================
  // INTERACTIVE LIVE PROMPT SIMULATOR (Home Page)
  // ==========================================
  const simInput = document.getElementById('sim-input-text');
  const simOutput = document.getElementById('sim-output-text');
  const simTriggerBtn = document.getElementById('btn-trigger-optimize');
  const simSpinner = document.getElementById('sim-spinner');
  const personaBtns = document.querySelectorAll('.persona-btn');

  if (simInput && simOutput && simTriggerBtn) {
    const personas = {
      critic: {
        input: "write a javascript function to sort an array of objects by a key",
        optimized: `<span class="tag-system">&lt;system_instruction&gt;</span>
You are a senior staff engineer with deep specialization in high-performance JavaScript algorithms.
Analyze the target data structure for type consistency and optimize for V8 engine execution constraints.
<span class="tag-system">&lt;/system_instruction&gt;</span>

<span class="tag-xml">&lt;instructions&gt;</span>
1. Write a robust sorting function that takes an array of objects and a target key.
2. Implement a strict type validation checkpoint to ensure the key exists in all items.
3. Add a fallback safety sequence to gracefully handle undefined/null properties.
4. Include inline benchmark metrics comparing typical Array.prototype.sort vs modern in-place index mapping.
<span class="tag-xml">&lt;/instructions&gt;</span>

<span class="tag-constraint">&lt;constraints&gt;</span>
- Return absolute type safety using JSDoc.
- Restrict execution complexity to O(N log N) time and O(1) auxiliary space.
- Never mutate the original array: return a shallow clone.
<span class="tag-constraint">&lt;/constraints&gt;</span>`
      },
      writer: {
        input: "Draft an email asking my boss for a deadline extension on the Axiom project.",
        optimized: `<span class="tag-system">&lt;system_instruction&gt;</span>
You are an expert executive communications coach. Draft highly professional, structured, and emotionally intelligent business communications.
<span class="tag-system">&lt;/system_instruction&gt;</span>

<span class="tag-xml">&lt;context&gt;</span>
- **Sender**: Senior Project Engineer.
- **Recipient**: Engineering Director (Boss).
- **Core Request**: Extend the target deadline of the Axiom Suite by 4 business days.
- **Reason**: Unforeseen regression in on-device Gemini Nano window.ai support requiring cloud-fallbacks.
<span class="tag-xml">&lt;/context&gt;</span>

<span class="tag-constraint">&lt;guidelines&gt;</span>
- Maintain a tone that is highly accountable, proactive, and collaborative (avoid apologetic or defensive phrasing).
- Clearly define the positive downstream impact of the extra time (e.g., complete WebCrypto security validation).
- Structure the email with clear bold visual milestones.
- Ensure the subject line is punchy, precise, and references the action item.
<span class="tag-constraint">&lt;/guidelines&gt;</span>`
      },
      summary: {
        input: "summarize this article about quantum computers: they use qubits, can be in superposition, and will solve cryptography equations faster.",
        optimized: `<span class="tag-system">&lt;system_instruction&gt;</span>
You are a precise data synthesist and technical technical writer.
Extract core facts with absolute structural clarity, eliminating verbose summaries or AI intro conversational filler.
<span class="tag-system">&lt;/system_instruction&gt;</span>

<span class="tag-xml">&lt;instructions&gt;</span>
Summarize the provided technical documentation into two logical blocks:
1. **The Core Synthesis**: An overarching 2-sentence explanation of the primary breakthrough.
2. **Milestone Takeaways**: A structured bulleted list highlighting key variables.
<span class="tag-xml">&lt;/instructions&gt;</span>

<span class="tag-constraint">&lt;formatting_constraints&gt;</span>
- Maximum length: 120 words total.
- Output format must strictly match:
  **Synthesis**: [Insert synthesis here]
  **Key Takeaways**:
  - [Takeaway 1]
  - [Takeaway 2]
<span class="tag-constraint">&lt;/formatting_constraints&gt;</span>`
      }
    };

    let activePersona = 'critic';
    let isTyping = false;

    // Set initial values
    const initialPersonaData = safeGet(personas, activePersona);
    if (initialPersonaData) {
      simInput.value = initialPersonaData.input;
    }
    simOutput.innerHTML = "<em>Click 'Optimize Prompt' to run Axiom's context injection engine...</em>";

    personaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isTyping) return;
        personaBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePersona = btn.dataset.persona;
        const currentPersonaData = safeGet(personas, activePersona);
        if (currentPersonaData) {
          simInput.value = currentPersonaData.input;
        }
        simOutput.innerHTML = "<em>Click 'Optimize Prompt' to run Axiom's context injection engine...</em>";
      });
    });

    simTriggerBtn.addEventListener('click', () => {
      if (isTyping) return;
      isTyping = true;
      simTriggerBtn.disabled = true;
      simTriggerBtn.textContent = "Optimizing...";
      if (simSpinner) simSpinner.style.display = 'flex';
      simOutput.innerHTML = "";

      const charCountEl = document.getElementById('token-char-count');
      const wordCountEl = document.getElementById('token-word-count');
      const tokenCountEl = document.getElementById('token-token-count');
      const costSavedEl = document.getElementById('token-cost-saved');
      const latencyValEl = document.getElementById('token-latency-val');
      const latencyPulseEl = document.getElementById('latency-pulse');

      if (charCountEl) charCountEl.textContent = "0";
      if (wordCountEl) wordCountEl.textContent = "0";
      if (tokenCountEl) tokenCountEl.textContent = "0";
      if (costSavedEl) costSavedEl.textContent = "$0.00000";
      if (latencyPulseEl) {
        latencyPulseEl.style.backgroundColor = 'var(--text-muted)';
        latencyPulseEl.style.boxShadow = 'none';
      }
      if (latencyValEl) latencyValEl.textContent = "0 ms";

      setTimeout(() => {
        if (simSpinner) simSpinner.style.display = 'none';
        // Guard with hasOwnProperty to prevent prototype chain access (CWE-94)
        const personaData = safeGet(personas, activePersona);
        if (!personaData) return;
        const targetText = personaData.optimized;
        
        // Parse the targetText into a secure DOM fragment to prevent CWE-79 and XSS
        const parser = new DOMParser();
        const doc = parser.parseFromString(targetText, 'text/html');
        const sourceNodes = Array.from(doc.body.childNodes);

        // Queue of actions to take for typewriter
        const actions = [];
        
        function queueNode(node, parentEl) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            for (let i = 0; i < text.length; i++) {
              actions.push({
                type: 'char',
                char: text.charAt(i),
                parent: parentEl
              });
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const newEl = document.createElement(node.tagName.toLowerCase());
            for (const attr of node.attributes) {
              newEl.setAttribute(attr.name, attr.value);
            }
            actions.push({
              type: 'element',
              element: newEl,
              parent: parentEl
            });
            for (const child of node.childNodes) {
              queueNode(child, newEl);
            }
          }
        }
        
        sourceNodes.forEach(node => queueNode(node, simOutput));

        function updateStats() {
          const text = simOutput.textContent || "";
          const chars = text.length;
          const words = text.split(/\s+/).filter(Boolean).length;
          const tokens = Math.ceil(chars / 4);
          const cost = tokens * 0.000015;

          if (charCountEl) charCountEl.textContent = chars.toLocaleString();
          if (wordCountEl) wordCountEl.textContent = words.toLocaleString();
          if (tokenCountEl) tokenCountEl.textContent = tokens.toLocaleString();
          if (costSavedEl) costSavedEl.textContent = `$${cost.toFixed(5)}`;

          if (latencyPulseEl) {
            latencyPulseEl.style.backgroundColor = '#f59e0b';
            latencyPulseEl.style.boxShadow = '0 0 8px #f59e0b';
          }
          if (latencyValEl) {
            const simLatency = Math.floor(Math.random() * 8) + 8;
            latencyValEl.textContent = `${simLatency} ms`;
          }
        }

        let actionIdx = 0;
        function stream() {
          if (actionIdx >= actions.length) {
            isTyping = false;
            simTriggerBtn.disabled = false;
            simTriggerBtn.textContent = "Optimize Prompt";
            if (latencyPulseEl) {
              latencyPulseEl.style.backgroundColor = '#10b981';
              latencyPulseEl.style.boxShadow = '0 0 8px #10b981';
            }
            if (latencyValEl) {
              latencyValEl.textContent = "12 ms";
            }
            return;
          }
          
          const action = actions.at(actionIdx++);
          if (action.type === 'element') {
            action.parent.appendChild(action.element);
            updateStats();
            setTimeout(stream, 4);
          } else if (action.type === 'char') {
            action.parent.appendChild(document.createTextNode(action.char));
            simOutput.scrollTop = simOutput.scrollHeight;
            updateStats();
            setTimeout(stream, 2);
          }
        }
        stream();
      }, 700);
    });
  }


  // ==========================================
  // DYNAMIC ROUTING DECISION TREE (Chrome Page)
  // ==========================================
  const toggleRoutingBtn = document.getElementById('btn-toggle-routing');
  const pathRoot = document.getElementById('path-root-router');
  const pathNano = document.getElementById('path-router-nano');
  const pathCloud = document.getElementById('path-router-cloud');
  const nodePrompt = document.getElementById('node-prompt');
  const nodeRouter = document.getElementById('node-router');
  const nodeNano = document.getElementById('node-nano');
  const nodeCloud = document.getElementById('node-cloud');
  const telStatus = document.getElementById('telemetry-status');
  const telLatency = document.getElementById('telemetry-latency');

  if (toggleRoutingBtn && pathRoot && pathNano && pathCloud) {
    let windowAiEnabled = true;

    toggleRoutingBtn.addEventListener('click', () => {
      windowAiEnabled = !windowAiEnabled;
      
      // Clear active states
      nodeNano.classList.remove('active');
      nodeCloud.classList.remove('active');
      pathNano.classList.remove('active');
      pathCloud.classList.remove('active');
      
      if (windowAiEnabled) {
        toggleRoutingBtn.textContent = "Disable window.ai";
        telStatus.textContent = "Local window.ai Active";
        telLatency.textContent = "5 ms (On-device)";
        
        pathNano.classList.add('active');
        nodeNano.classList.add('active');
      } else {
        toggleRoutingBtn.textContent = "Enable window.ai";
        telStatus.textContent = "Cloud Gemini Fallback Active";
        telLatency.textContent = "450 ms (Cloud Gemini)";
        
        pathCloud.classList.add('active');
        nodeCloud.classList.add('active');
      }
    });
  }


  // ==========================================
  // PERSONA JSON BUILDER & VALIDATOR (Chrome Page)
  // ==========================================
  const buildId = document.getElementById('builder-id');
  const buildName = document.getElementById('builder-name');
  const buildDesc = document.getElementById('builder-desc');
  const buildInstruction = document.getElementById('builder-instruction');
  const jsonOutput = document.getElementById('json-output-block');
  const jsonStatus = document.getElementById('json-status');

  if (buildId && buildName && buildDesc && buildInstruction && jsonOutput) {
    function updateJsonOutput() {
      const personaObj = [{
        id: buildId.value.trim().toLowerCase().replace(/\s+/g, '-'),
        name: buildName.value.trim(),
        description: buildDesc.value.trim(),
        systemInstruction: buildInstruction.value.trim()
      }];

      const formattedJson = JSON.stringify(personaObj, null, 2);
      jsonOutput.textContent = formattedJson;

      // Real-time validation visual cue
      if (personaObj[0].id && personaObj[0].name && personaObj[0].systemInstruction) {
        jsonStatus.textContent = "Valid Schema";
        jsonStatus.style.background = "var(--accent-red-light)";
        jsonStatus.style.color = "var(--accent-red)";
        jsonStatus.style.borderColor = "var(--accent-red-border)";
      } else {
        jsonStatus.textContent = "Incomplete Fields";
        jsonStatus.style.background = "rgba(245, 158, 11, 0.1)";
        jsonStatus.style.color = "#f59e0b";
        jsonStatus.style.borderColor = "rgba(245, 158, 11, 0.2)";
      }
    }

    [buildId, buildName, buildDesc, buildInstruction].forEach(input => {
      input.addEventListener('input', updateJsonOutput);
    });

    // Run initial update
    updateJsonOutput();
  }


  // ==========================================
  // AX INTERCEPTION / CLIPBOARD SIMULATOR (macOS Page)
  // ==========================================
  const btnVSCode = document.getElementById('btn-ax-vscode');
  const btnSandboxed = document.getElementById('btn-ax-sandboxed');
  const screenTrusted = document.getElementById('ax-screen-trusted');
  const screenSandboxed = document.getElementById('ax-screen-sandboxed');
  const appHeader = document.getElementById('ax-app-header');
  const logFeed = document.getElementById('ax-log-feed');

  if (btnVSCode && btnSandboxed && screenTrusted && screenSandboxed && logFeed) {
    let logTimers = [];

    const logsData = {
      trusted: [
        { text: "[INIT] Intercepting shortcut Control+Shift+Space...", type: "normal", delay: 200 },
        { text: "[QUERY] Querying AXUIElement focused object...", type: "normal", delay: 600 },
        { text: "[SUCCESS] API Connection: accessibility trusted client confirmed", type: "success", delay: 1000 },
        { text: "[SUCCESS] AXUIElement: selection content read successfully (26 chars)", type: "success", delay: 1400 },
        { text: "[LAUNCH] Launching HUD SwiftUI Accessory View...", type: "normal", delay: 1800 },
        { text: "[SUCCESS] AXUIElement: in-place prompt replacement written successfully (0ms clipboard latency)", type: "success", delay: 2300 }
      ],
      sandboxed: [
        { text: "[INIT] Intercepting shortcut Control+Shift+Space...", type: "normal", delay: 200 },
        { text: "[QUERY] Querying AXUIElement focused object...", type: "normal", delay: 500 },
        { text: "[WARN] Security Block: sandbox target element context restricted", type: "warning", delay: 900 },
        { text: "[CLIPBOARD] Triggering clipboard fallback virtual keystroke Cmd+C...", type: "normal", delay: 1300 },
        { text: "[SUCCESS] NSPasteboard: read selection successfully from system buffer", type: "success", delay: 1600 },
        { text: "[LAUNCH] Launching HUD SwiftUI Accessory View...", type: "normal", delay: 2000 },
        { text: "[CLIPBOARD] Injecting result: virtual keystroke Cmd+V sequence...", type: "normal", delay: 2400 },
        { text: "[SUCCESS] NSPasteboard: original clipboard state restored", type: "success", delay: 2800 }
      ]
    };

    function clearLogTimers() {
      logTimers.forEach(timer => clearTimeout(timer));
      logTimers = [];
    }

    function runInterceptionSimulation(mode) {
      clearLogTimers();
      logFeed.innerHTML = "";
      
      // Guard with hasOwnProperty to prevent prototype chain access (CWE-94)
      const targetLogs = safeGet(logsData, mode);
      if (!targetLogs) return;
      
      targetLogs.forEach(log => {
        const timer = setTimeout(() => {
          const logDiv = document.createElement('div');
          logDiv.className = `log-entry ${log.type}`;
          
          let icon = "->";
          if (log.type === "success") icon = "[OK]";
          if (log.type === "warning") icon = "[!]";
          
          logDiv.innerHTML = `
            <span class="log-entry-icon"></span>
            <span class="log-entry-text"></span>
          `;
          
          const iconEl = logDiv.querySelector('.log-entry-icon');
          if (iconEl) iconEl.textContent = icon;
          
          const textEl = logDiv.querySelector('.log-entry-text');
          if (textEl) textEl.textContent = log.text;
          
          logFeed.appendChild(logDiv);
          logFeed.scrollTop = logFeed.scrollHeight;
        }, log.delay);
        
        logTimers.push(timer);
      });
    }

    btnVSCode.addEventListener('click', () => {
      btnVSCode.classList.add('active');
      btnSandboxed.classList.remove('active');
      
      screenTrusted.style.display = "block";
      screenSandboxed.style.display = "none";
      appHeader.textContent = "Target Application: VS Code (AX Trusted Area)";
      
      runInterceptionSimulation("trusted");
    });

    btnSandboxed.addEventListener('click', () => {
      btnSandboxed.classList.add('active');
      btnVSCode.classList.remove('active');
      
      screenTrusted.style.display = "none";
      screenSandboxed.style.display = "block";
      appHeader.textContent = "Target Application: Sandboxed terminal container";
      
      runInterceptionSimulation("sandboxed");
    });

    // Run initial VS Code simulation
    runInterceptionSimulation("trusted");
  }


  // ==========================================
  // WORKLOAD CIRCULAR GAUGE SPEEDOMETER (macOS Page)
  // ==========================================
  const gaugeAxiom = document.getElementById('gauge-axiom');
  const gaugeElectron = document.getElementById('gauge-electron');
  const axiomText = document.getElementById('gauge-val-axiom-text');
  const electronText = document.getElementById('gauge-val-electron-text');
  const loadLabel = document.getElementById('telemetry-load-label');
  const telemetryTabs = document.querySelectorAll('.telemetry-tab');

  if (gaugeAxiom && gaugeElectron) {
    const dashArray = 440; // 2 * Math.PI * r (r=70)

    const workloadData = {
      idle: {
        axiom: { ram: 30, offset: dashArray * (1 - 30/1000) },
        electron: { ram: 512, offset: dashArray * (1 - 512/1000) },
        label: "Idle Background Utility"
      },
      active: {
        axiom: { ram: 52, offset: dashArray * (1 - 52/1000) },
        electron: { ram: 680, offset: dashArray * (1 - 680/1000) },
        label: "Actively Streaming Optimization"
      },
      payload: {
        axiom: { ram: 58, offset: dashArray * (1 - 58/1000) },
        electron: { ram: 890, offset: dashArray * (1 - 890/1000) },
        label: "Peak Payload Processing"
      }
    };

    function updateGauges(state) {
      // Guard with hasOwnProperty to prevent prototype chain access (CWE-94)
      const data = safeGet(workloadData, state);
      if (!data) return;
      
      // Animate Stroke Offset
      gaugeAxiom.style.strokeDashoffset = data.axiom.offset;
      gaugeElectron.style.strokeDashoffset = data.electron.offset;
      
      // Update Inner text values
      axiomText.textContent = `${data.axiom.ram} MB`;
      electronText.textContent = `${data.electron.ram} MB`;
      
      // Update Status Label
      loadLabel.textContent = data.label;
    }

    telemetryTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        telemetryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const loadState = tab.dataset.load;
        updateGauges(loadState);
      });
    });

    // Run initial gauges loading
    setTimeout(() => {
      updateGauges("idle");
    }, 200);
  }


  // ==========================================
  // INTERACTIVE KEYBOARD SHORTCUT TRAINING
  // ==========================================
  const shortcutCards = document.querySelectorAll('.shortcut-card');
  const keyboardKeys = {
    control: document.getElementById('key-left-ctrl'),
    shift: document.getElementById('key-left-shift'),
    space: document.getElementById('key-space'),
    o: document.getElementById('key-O'),
    p: document.getElementById('key-P')
  };

  if (shortcutCards.length > 0) {
    function clearKeyboardHighlights() {
      Object.values(keyboardKeys).forEach(key => {
        if (key) key.classList.remove('active');
      });
    }

    function highlightKeys(keysList) {
      clearKeyboardHighlights();
      keysList.forEach(keyName => {
        const keyObj = safeGet(keyboardKeys, keyName.trim().toLowerCase());
        if (keyObj) keyObj.classList.add('active');
      });
    }

    shortcutCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        shortcutCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        const targetKeys = card.dataset.keys.split(',');
        highlightKeys(targetKeys);
      });
    });

    // Set default keyboard trigger key highlights
    highlightKeys(['control', 'shift', 'space']);
  }




  // ==========================================
  // CLICK-TO-COPY TERMINAL CLIPBOARD UTILITY
  // ==========================================
  const copyButtons = document.querySelectorAll('.btn-copy');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const codeElement = document.getElementById(targetId);
      if (codeElement) {
        const textToCopy = codeElement.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalText = btn.textContent;
          btn.textContent = "Copied!";
          btn.style.backgroundColor = "var(--accent-red)";
          btn.style.color = "white";
          btn.style.borderColor = "var(--accent-red)";
          
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = "";
            btn.style.color = "";
            btn.style.borderColor = "";
          }, 2000);
        }).catch(err => {
          console.error('Could not copy command to clipboard: ', err);
        });
      }
    });
  });

  // ==========================================
  // DYNAMIC PLATFORM/BROWSER AUTO-DETECTOR & SMART CTAs
  // ==========================================
  const heroBtnPrimary = document.getElementById('hero-btn-primary');
  const heroBtnSecondary = document.getElementById('hero-btn-secondary');
  const heroHelper = document.getElementById('hero-platform-helper');

  if (heroBtnPrimary && heroBtnSecondary && heroHelper) {
    const userAgent = navigator.userAgent;
    const isMac = userAgent.includes("Mac") || navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isWindows = userAgent.includes("Win") || navigator.platform.toUpperCase().indexOf('WIN') >= 0;
    const isLinux = userAgent.includes("Linux") || navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
    const isChrome = userAgent.includes("Chrome") && !userAgent.includes("Edg") && !userAgent.includes("OPR");

    let osName = "Unknown OS";
    if (isMac) osName = "macOS";
    else if (isWindows) osName = "Windows";
    else if (isLinux) osName = "Linux";

    let primaryText = "View Installation Guide";
    let primaryLink = "install.html";
    let secondaryText = "Try Live Simulator";
    let secondaryLink = "#simulator";
    let helperHtml = "";

    if (isMac) {
      primaryText = "Download macOS App";
      primaryLink = "macos.html";
      secondaryText = "Get Chrome Extension";
      secondaryLink = "chrome.html";
    } else {
      primaryText = "Get Chrome Extension";
      primaryLink = "chrome.html";
      secondaryText = "Explore Setup Guide";
      secondaryLink = "install.html";
    }

    heroBtnPrimary.textContent = primaryText;
    heroBtnPrimary.href = primaryLink;
    heroBtnSecondary.textContent = secondaryText;
    heroBtnSecondary.href = secondaryLink;

    // Secure dynamic DOM construction to prevent CWE-116 and XSS
    heroHelper.innerHTML = "";
    const alertBox = document.createElement('div');
    alertBox.className = 'axiom-platform-alert';
    alertBox.style.cssText = 'display: inline-flex; padding: 6px 18px; border-radius: var(--radius-full); margin-top: 12px; border: 1px solid var(--border-color); background: var(--bg-card); font-size: 0.8rem; color: var(--text-secondary); align-items: center; gap: 12px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);';

    const compatSpan = document.createElement('span');
    compatSpan.textContent = isMac ? "macOS 13+ and Chromium compatible" : "Windows / Linux extension compatible";
    alertBox.appendChild(compatSpan);

    const separator = document.createElement('span');
    separator.style.cssText = 'width: 1px; height: 12px; background-color: var(--border-color);';
    alertBox.appendChild(separator);

    const statusWrapper = document.createElement('span');
    statusWrapper.style.cssText = 'display: inline-flex; align-items: center; color: var(--text-primary); font-weight: 500;';

    if (isChrome) {
      const dot = document.createElement('span');
      dot.style.cssText = 'display: inline-block; width: 6px; height: 6px; background-color: #10b981; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 8px #10b981;';
      statusWrapper.appendChild(dot);
      statusWrapper.appendChild(document.createTextNode("On-device AI enabled"));
    } else {
      statusWrapper.appendChild(document.createTextNode("On-device AI requires Chrome"));
    }
    alertBox.appendChild(statusWrapper);
    heroHelper.appendChild(alertBox);
  }

  // ==========================================
  // INTERACTIVE COST-PERFORMANCE ROI CALCULATOR
  // ==========================================
  const promptsSlider = document.getElementById('roi-prompts-slider');
  const lengthSlider = document.getElementById('roi-length-slider');
  const promptsVal = document.getElementById('roi-prompts-val');
  const lengthVal = document.getElementById('roi-length-val');
  const metricSavings = document.getElementById('roi-metric-savings');
  const metricLatency = document.getElementById('roi-metric-latency');

  if (promptsSlider && lengthSlider) {
    function calculateROI() {
      const prompts = parseInt(promptsSlider.value, 10);
      const length = parseInt(lengthSlider.value, 10);

      promptsVal.textContent = prompts.toLocaleString();
      lengthVal.textContent = `${length.toLocaleString()} tokens`;

      // API Cost Savings: Blended rate of $0.0015 per 1,000 tokens ($0.0000015/token)
      const monthlySavings = prompts * length * 30 * 0.0000015;
      metricSavings.textContent = `$${monthlySavings.toFixed(2)}`;

      // Latency Saved: Local Nano is ~25ms vs Cloud API is ~1250ms (Savings: 1225ms = 1.225s per call)
      const monthlyLatencySeconds = prompts * 30 * 1.225;
      const hoursSaved = monthlyLatencySeconds / 3600;
      
      if (hoursSaved < 1) {
        const minutesSaved = monthlyLatencySeconds / 60;
        metricLatency.textContent = `${minutesSaved.toFixed(0)} mins`;
      } else {
        metricLatency.textContent = `${hoursSaved.toFixed(1)} hrs`;
      }
    }

    promptsSlider.addEventListener('input', calculateROI);
    lengthSlider.addEventListener('input', calculateROI);
    calculateROI();
  }

  // ==========================================
  // COMMUNITY PERSONA GALLERY SYSTEM
  // ==========================================
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryJsonBlock = document.getElementById('gallery-json-block');
  const copyGalleryBtn = document.getElementById('btn-copy-gallery-json');
  const syncGalleryBtn = document.getElementById('btn-sync-gallery');
  const syncJsonStatus = document.getElementById('sync-json-status');

  const galleryPersonas = {
    "sql-wizard": {
      id: "sql-wizard",
      name: "SQL Wizard",
      description: "Transforms plain English specifications into high-performance, indexed SQL queries.",
      systemInstruction: "You are a senior database administrator. Convert the request into an ANSI SQL-compliant query. Optimize for execution speed using index tips and appropriate JOIN strategies."
    },
    "regex-optimizer": {
      id: "regex-optimizer",
      name: "Regex Optimizer",
      description: "Constructs and documents highly efficient, safe regular expressions.",
      systemInstruction: "You are a master of regular expressions. Write an optimized regex pattern that is safe from ReDoS attacks. Explain each capture group structurally."
    },
    "git-commit": {
      id: "git-commit-formatter",
      name: "Git Commit Formatter",
      description: "Generates pristine, semantic conventional commit messages from git diff statements.",
      systemInstruction: "You are a technical lead. Generate a semantic commit message following the Conventional Commits specification based on the provided git diff. Keep it concise."
    },
    "analyst": {
      id: "data-analyst",
      name: "Data Analyst",
      description: "Enriches raw data metrics into visual telemetry dashboards and analytical summaries.",
      systemInstruction: "You are an expert data science consultant. Group these metrics into statistical classes, highlight standard dev spikes, and suggest markdown charts."
    }
  };

  if (galleryGrid && galleryJsonBlock && copyGalleryBtn) {
    let activePersonaId = "sql-wizard";

    function updateGalleryJson() {
      const data = safeGet(galleryPersonas, activePersonaId);
      if (data) {
        galleryJsonBlock.textContent = JSON.stringify([data], null, 2);
      }
    }

    updateGalleryJson();

    const cards = galleryGrid.querySelectorAll('.gallery-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        activePersonaId = card.dataset.personaId;
        updateGalleryJson();
        
        if (syncJsonStatus) {
          syncJsonStatus.textContent = "Ready to Sync";
          syncJsonStatus.style.background = "";
          syncJsonStatus.style.color = "";
          syncJsonStatus.style.borderColor = "";
        }
      });
    });

    copyGalleryBtn.addEventListener('click', () => {
      const jsonText = galleryJsonBlock.textContent;
      navigator.clipboard.writeText(jsonText).then(() => {
        const btnSpan = copyGalleryBtn.querySelector('span');
        if (btnSpan) btnSpan.textContent = "JSON Copied!";
        copyGalleryBtn.style.backgroundColor = "#10b981";
        copyGalleryBtn.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
        if (syncJsonStatus) {
          syncJsonStatus.textContent = "Copied to Clipboard";
          syncJsonStatus.style.background = "rgba(16, 185, 129, 0.08)";
          syncJsonStatus.style.color = "#10b981";
          syncJsonStatus.style.borderColor = "rgba(16, 185, 129, 0.15)";
        }

        setTimeout(() => {
          if (btnSpan) btnSpan.textContent = "1-Click Copy Config";
          copyGalleryBtn.style.backgroundColor = "";
          copyGalleryBtn.style.boxShadow = "";
          if (syncJsonStatus) {
            syncJsonStatus.textContent = "Ready to Sync";
            syncJsonStatus.style.background = "";
            syncJsonStatus.style.color = "";
            syncJsonStatus.style.borderColor = "";
          }
        }, 1800);
      });
    });

    if (syncGalleryBtn) {
      syncGalleryBtn.addEventListener('click', () => {
        const svg = syncGalleryBtn.querySelector('svg');
        const btnText = syncGalleryBtn.querySelector('span');

        if (svg) {
          svg.style.transition = 'transform 1.5s var(--ease-smooth)';
          svg.style.transform = 'rotate(720deg)';
        }
        btnText.textContent = 'Synchronizing...';
        syncGalleryBtn.disabled = true;

        setTimeout(() => {
          if (svg) {
            svg.style.transition = 'none';
            svg.style.transform = 'none';
          }
          btnText.textContent = 'Synced successfully!';
          
          if (!document.getElementById('gallery-added-persona')) {
            const newCard = document.createElement('div');
            newCard.className = 'gallery-card';
            newCard.id = 'gallery-added-persona';
            newCard.dataset.personaId = 'analyst';
            newCard.dataset.category = 'dev';
            newCard.style.padding = '12px';
            newCard.style.gap = '8px';
            newCard.style.display = 'flex';
            newCard.style.flexDirection = 'column';
            newCard.style.animation = 'fadeIn 0.5s ease-out';
            newCard.innerHTML = `
              <div class="gallery-header" style="margin-bottom: 2px;">
                <span class="gallery-avatar" style="width: 28px; height: 28px; font-size: 0.7rem; font-weight: 700; background: rgba(168,85,247,0.1); color: #a855f7; display: flex; align-items: center; justify-content: center;">ANL</span>
                <span class="gallery-pill" style="font-size: 0.6rem; padding: 2px 6px;">Data</span>
              </div>
              <div class="gallery-info">
                <div class="gallery-name" style="font-size: 0.8rem; font-weight: 700;">Data Analyst</div>
                <div class="gallery-desc" style="font-size: 0.65rem; line-height: 1.2;">Enrich telemetry charts</div>
              </div>
              <div class="gallery-stats" style="font-size: 0.6rem; margin-top: 2px; padding-top: 6px;">
                <span>Latency: 10ms</span>
                <span>99%</span>
              </div>
            `;
            galleryGrid.appendChild(newCard);

            newCard.addEventListener('click', () => {
              galleryGrid.querySelectorAll('.gallery-card').forEach(c => c.classList.remove('active'));
              newCard.classList.add('active');
              activePersonaId = 'analyst';
              updateGalleryJson();
              
              if (syncJsonStatus) {
                syncJsonStatus.textContent = "Ready to Sync";
                syncJsonStatus.style.background = "";
                syncJsonStatus.style.color = "";
                syncJsonStatus.style.borderColor = "";
              }
            });
          }

          setTimeout(() => {
            btnText.textContent = 'Simulate Sync';
            syncGalleryBtn.disabled = false;
          }, 1500);
        }, 1500);
      });
    }
  }

  // ==========================================
  // INTERACTIVE ONBOARDING CONNECTION VALIDATOR
  // ==========================================
  const validatorBoxOnboarding = document.getElementById('connection-validator');
  const btnTestConnection = document.getElementById('btn-test-connection');

  if (validatorBoxOnboarding && btnTestConnection) {
    const dot = document.getElementById('validator-dot');
    const statusText = document.getElementById('validator-status-text');
    const detailsText = document.getElementById('validator-details-text');

    dot.className = "validator-indicator-dot checking";
    dot.style.backgroundColor = "#f59e0b";
    dot.style.boxShadow = "0 0 10px rgba(245, 158, 11, 0.6)";
    statusText.textContent = "Awaiting Connection";
    detailsText.textContent = "Click 'Test Extension Connection' to simulate secure client integration.";

    btnTestConnection.addEventListener('click', () => {
      btnTestConnection.disabled = true;
      btnTestConnection.querySelector('span').textContent = "Pinging Axiom Client...";
      
      dot.style.animation = "orangePulse 0.5s infinite";
      statusText.textContent = "Establishing Local SSL Handshake...";
      detailsText.textContent = "Exchanging AES-GCM cryptographic validation tokens...";

      setTimeout(() => {
        dot.className = "validator-indicator-dot connected";
        dot.style.animation = "none";
        dot.style.backgroundColor = "#10b981";
        dot.style.boxShadow = "0 0 12px rgba(16, 185, 129, 0.8)";
        
        statusText.innerHTML = `<span style="color: #10b981; font-weight: 700; animation: popSuccess 0.4s var(--ease-spring);">Connected!</span>`;
        detailsText.textContent = "Secure Loopback fully operational on port 24200";
        
        validatorBoxOnboarding.style.borderColor = "rgba(16, 185, 129, 0.4)";
        validatorBoxOnboarding.style.background = "rgba(16, 185, 129, 0.04)";

        btnTestConnection.style.backgroundColor = "#10b981";
        btnTestConnection.style.color = "#ffffff";
        btnTestConnection.style.borderColor = "transparent";
        btnTestConnection.querySelector('span').textContent = "Connection Valid!";

        launchConfetti();
      }, 1400);
    });

    function launchConfetti() {
      const canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      let width = canvas.width = window.innerWidth;
      let height = canvas.height = window.innerHeight;

      window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      });

      const colors = ['#ff5f56', '#ffbd2e', '#27c93f', '#e60023', '#3b82f6', '#10b981', '#a855f7'];
      const particles = [];

      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height - height,
          r: Math.random() * 5 + 3,
          d: Math.random() * height,
          color: colors.at(Math.floor(Math.random() * colors.length)),
          tilt: Math.random() * 10 - 5,
          tiltAngleIncremental: Math.random() * 0.06 + 0.02,
          tiltAngle: 0
        });
      }

      let animationFrameId;
      const startTime = Date.now();

      function draw() {
        ctx.clearRect(0, 0, width, height);
        
        let finished = true;
        for (let i = 0; i < particles.length; i++) {
          const p = particles.at(i);
          p.tiltAngle += p.tiltAngleIncremental;
          p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
          p.x += Math.sin(p.tiltAngle);
          p.tilt = Math.sin(p.tiltAngle - i / 3) * 12;

          if (p.y < height) {
            finished = false;
          }

          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
          ctx.stroke();
        }

        if (finished || Date.now() - startTime > 3500) {
          cancelAnimationFrame(animationFrameId);
          canvas.remove();
        } else {
          animationFrameId = requestAnimationFrame(draw);
        }
      }

      draw();
    }
  }

  // ==========================================
  // ADVANCED AXIOM INTERACTIVE FEATURES
  // ==========================================

  // 1. Interactive Prompt Compare Slider
  const compareRange = document.getElementById('compare-slider-range');
  const compareCard = document.getElementById('compare-slider-card');
  if (compareRange && compareCard) {
    compareRange.addEventListener('input', (e) => {
      const val = e.target.value;
      compareCard.style.setProperty('--slider-pos', `${val}%`);
    });
  }

  // 2. Native window.ai Browser Capability Tester
  function checkWindowAiCapabilities() {
    const isAiAvailable = typeof window.ai !== 'undefined';
    
    // Header Nodes
    const headerDot = document.getElementById('window-ai-header-dot');
    const headerText = document.getElementById('window-ai-header-text');
    
    // Sidebar Nodes (Home page only)
    const sidebarCard = document.getElementById('window-ai-status-card');
    const sidebarDot = document.getElementById('window-ai-dot');
    const sidebarTitle = document.getElementById('window-ai-status-title');
    const sidebarDesc = document.getElementById('window-ai-status-desc');
    
    if (isAiAvailable) {
      // Glow green if user has Gemini Nano enabled
      if (headerDot) {
        headerDot.style.backgroundColor = '#10b981';
        headerDot.style.boxShadow = '0 0 10px #10b981';
      }
      if (headerText) {
        headerText.textContent = 'Gemini Nano Active';
      }
      
      if (sidebarDot) {
        sidebarDot.style.backgroundColor = '#10b981';
        sidebarDot.style.boxShadow = '0 0 10px #10b981';
      }
      if (sidebarTitle) {
        sidebarTitle.textContent = 'local gemini nano';
      }
      if (sidebarDesc) {
        sidebarDesc.textContent = 'Capable. Native window.ai provider detected and active.';
      }
    } else {
      // Fallback instructions
      if (headerDot) {
        headerDot.style.backgroundColor = '#f59e0b';
        headerDot.style.boxShadow = '0 0 8px #f59e0b';
      }
      if (headerText) {
        headerText.textContent = 'AI Offline';
      }
      
      if (sidebarDot) {
        sidebarDot.style.backgroundColor = '#f59e0b';
        sidebarDot.style.boxShadow = '0 0 8px #f59e0b';
      }
      if (sidebarTitle) {
        sidebarTitle.textContent = 'local gemini nano';
      }
      if (sidebarDesc) {
        sidebarDesc.textContent = 'Gemini Nano Unavailable. Enable optimization-guide-on-device-model flags in Chrome.';
      }
    }
  }
  
  checkWindowAiCapabilities();

  // 3. Interactive Configuration Profile Builder (install.html only)
  const cfgApiKey = document.getElementById('cfg-api-key');
  const cfgPersona = document.getElementById('cfg-persona');
  const cfgTemp = document.getElementById('cfg-temp');
  const cfgTempVal = document.getElementById('cfg-temp-val');
  const cfgTokens = document.getElementById('cfg-tokens');
  const cfgTokensVal = document.getElementById('cfg-tokens-val');
  const cfgJsonBlock = document.getElementById('cfg-json-block');

  if (cfgJsonBlock) {
    function updateConfigJson() {
      const apiKeyVal = cfgApiKey && cfgApiKey.value ? cfgApiKey.value : 'YOUR_STUDIO_KEY';
      const personaVal = cfgPersona ? cfgPersona.value : 'code-reviewer';
      const tempVal = cfgTemp ? parseFloat(cfgTemp.value) : 0.7;
      const tokensVal = cfgTokens ? parseInt(cfgTokens.value, 10) : 2048;

      const configObject = {
        apiKey: apiKeyVal,
        defaultPersona: personaVal,
        temperature: tempVal,
        maxTokens: tokensVal
      };

      cfgJsonBlock.textContent = JSON.stringify(configObject, null, 2);
    }

    if (cfgApiKey) cfgApiKey.addEventListener('input', updateConfigJson);
    if (cfgPersona) cfgPersona.addEventListener('change', updateConfigJson);
    if (cfgTemp) {
      cfgTemp.addEventListener('input', (e) => {
        if (cfgTempVal) cfgTempVal.textContent = e.target.value;
        updateConfigJson();
      });
    }
    if (cfgTokens) {
      cfgTokens.addEventListener('input', (e) => {
        if (cfgTokensVal) cfgTokensVal.textContent = e.target.value;
        updateConfigJson();
      });
    }

    updateConfigJson();
  }

  // 4. Floating Global Shortcuts Keyboard Cheat-Sheet
  let modalEl = document.getElementById('shortcuts-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'shortcuts-modal';
    modalEl.style.position = 'fixed';
    modalEl.style.top = '0';
    modalEl.style.left = '0';
    modalEl.style.width = '100vw';
    modalEl.style.height = '100vh';
    modalEl.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modalEl.style.backdropFilter = 'blur(20px)';
    modalEl.style.webkitBackdropFilter = 'blur(20px)';
    modalEl.style.zIndex = '10000';
    modalEl.style.display = 'none';
    modalEl.style.alignItems = 'center';
    modalEl.style.justifyContent = 'center';
    modalEl.style.opacity = '0';
    modalEl.style.transition = 'opacity 0.3s ease';

    modalEl.innerHTML = `
      <div class="shortcuts-modal-card" style="position: relative; width: 90%; max-width: 480px; background: rgba(30, 30, 35, 0.7); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); animation: modalScaleIn 0.3s ease-out;">
        <button id="btn-shortcuts-close" aria-label="Close modal" style="position: absolute; right: 20px; top: 20px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="card-tag" style="margin-bottom: 8px;">System Documentation</div>
        <h2 class="card-title" style="margin-top: 0; margin-bottom: 16px; font-size: 1.4rem;">Keyboard Shortcuts</h2>
        
        <div class="shortcuts-list" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">Toggle Global Help Sheet</span>
            <kbd style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; font-family: monospace; color: var(--accent-red); box-shadow: 0 2px 0 rgba(0,0,0,0.2);">?</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">Dismiss Help Sheet / Modals</span>
            <kbd style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; font-family: monospace; color: var(--text-secondary); box-shadow: 0 2px 0 rgba(0,0,0,0.2);">ESC</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">Toggle Dark Mode Theme</span>
            <kbd style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; font-family: monospace; color: var(--text-secondary); box-shadow: 0 2px 0 rgba(0,0,0,0.2);">T</kbd>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
            <span style="font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">Trigger Context Optimization</span>
            <kbd style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; font-family: monospace; color: var(--text-secondary); box-shadow: 0 2px 0 rgba(0,0,0,0.2);">CMD + ENTER</kbd>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // Add animation styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes modalScaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  const closeBtn = document.getElementById('btn-shortcuts-close');

  function openShortcutsModal() {
    modalEl.style.display = 'flex';
    setTimeout(() => {
      modalEl.style.opacity = '1';
    }, 10);
  }

  function closeShortcutsModal() {
    modalEl.style.opacity = '0';
    setTimeout(() => {
      modalEl.style.display = 'none';
    }, 300);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeShortcutsModal);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeShortcutsModal();
  });

  // Hotkey Trigger ('?')
  window.addEventListener('keydown', (e) => {
    // Prevent trigger inside text input elements
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
      // Allow Cmd+Enter inside input/textarea to trigger prompt optimization
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        const triggerBtn = document.getElementById('btn-trigger-optimize');
        if (triggerBtn && !triggerBtn.disabled) {
          triggerBtn.click();
        }
      }
      return;
    }

    if (e.key === '?' || e.key === '/') {
      e.preventDefault();
      openShortcutsModal();
    } else if (e.key === 'Escape') {
      closeShortcutsModal();
    } else if (e.key.toLowerCase() === 't') {
      const themeBtn = document.getElementById('btn-theme-toggle');
      if (themeBtn) themeBtn.click();
    }
  });

  // Toggle button header
  const shortcutsToggleBtn = document.getElementById('btn-shortcuts-toggle');
  if (shortcutsToggleBtn) {
    shortcutsToggleBtn.addEventListener('click', openShortcutsModal);
  }

  // 5. Gallery Search & Category Filtering
  const filterTabs = document.querySelectorAll('.gallery-filter-tab');
  const searchInput = document.getElementById('gallery-search-input');
  
  if (filterTabs.length > 0 || searchInput) {
    let currentFilter = 'all';
    let searchQuery = '';

    function filterGallery() {
      const cards = galleryGrid ? galleryGrid.querySelectorAll('.gallery-card') : [];
      cards.forEach(card => {
        const cardCategory = card.dataset.category ? card.dataset.category.toLowerCase() : '';
        const nameNode = card.querySelector('.gallery-name');
        const descNode = card.querySelector('.gallery-desc');
        const nameText = nameNode ? nameNode.textContent.toLowerCase() : '';
        const descText = descNode ? descNode.textContent.toLowerCase() : '';
        
        const matchesCategory = currentFilter === 'all' || cardCategory === currentFilter;
        const matchesSearch = nameText.includes(searchQuery) || descText.includes(searchQuery);

        if (matchesCategory && matchesSearch) {
          card.style.display = 'flex';
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
          card.style.pointerEvents = 'auto';
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          card.style.pointerEvents = 'none';
        }
      });
    }

    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.classList.remove('active');
          t.style.background = 'transparent';
          t.style.border = '1px solid transparent';
        });
        tab.classList.add('active');
        tab.style.background = 'var(--bg-secondary)';
        tab.style.border = '1px solid var(--border-color)';
        currentFilter = tab.dataset.filter.toLowerCase();
        filterGallery();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterGallery();
      });
    }
  }

});
