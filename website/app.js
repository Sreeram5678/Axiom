document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // ☀️ NATIVE LIGHT / DARK THEME TOGGLE SYSTEM 🌙
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
  // 📝 INTERACTIVE LIVE PROMPT SIMULATOR (Home Page)
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
    simInput.value = personas[activePersona].input;
    simOutput.innerHTML = "<em>Click 'Optimize Prompt' to run Axiom's context injection engine...</em>";

    personaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isTyping) return;
        personaBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePersona = btn.dataset.persona;
        simInput.value = personas[activePersona].input;
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

      setTimeout(() => {
        if (simSpinner) simSpinner.style.display = 'none';
        const targetText = personas[activePersona].optimized;
        
        // Custom HTML visual character splitter
        const tokens = [];
        let temp = "";
        let inTag = false;
        
        for (let i = 0; i < targetText.length; i++) {
          const char = targetText[i];
          if (char === '<') {
            if (temp) {
              tokens.push({ type: 'text', value: temp });
              temp = "";
            }
            inTag = true;
            temp += char;
          } else if (char === '>') {
            temp += char;
            tokens.push({ type: 'tag', value: temp });
            temp = "";
            inTag = false;
          } else {
            temp += char;
          }
        }
        if (temp) {
          tokens.push({ type: inTag ? 'tag' : 'text', value: temp });
        }

        let tokenIdx = 0;
        let charIdx = 0;
        
        function stream() {
          if (tokenIdx >= tokens.length) {
            isTyping = false;
            simTriggerBtn.disabled = false;
            simTriggerBtn.textContent = "Optimize Prompt";
            return;
          }
          
          const currentToken = tokens[tokenIdx];
          if (currentToken.type === 'tag') {
            simOutput.innerHTML += currentToken.value;
            tokenIdx++;
            setTimeout(stream, 8);
          } else {
            // Stream plain text visual element by visual element (grouping entities)
            if (!currentToken.chars) {
              currentToken.chars = [];
              let i = 0;
              const str = currentToken.value;
              while (i < str.length) {
                if (str[i] === '&') {
                  let entity = '&';
                  i++;
                  while (i < str.length && str[i] !== ';') {
                    entity += str[i];
                    i++;
                  }
                  if (i < str.length) {
                    entity += ';';
                    i++;
                  }
                  currentToken.chars.push(entity);
                } else {
                  currentToken.chars.push(str[i]);
                  i++;
                }
              }
            }

            if (charIdx < currentToken.chars.length) {
              simOutput.innerHTML += currentToken.chars[charIdx];
              charIdx++;
              simOutput.scrollTop = simOutput.scrollHeight;
              setTimeout(stream, 4);
            } else {
              charIdx = 0;
              tokenIdx++;
              setTimeout(stream, 8);
            }
          }
        }
        stream();
      }, 700);
    });
  }


  // ==========================================
  // ⚡ DYNAMIC ROUTING DECISION TREE (Chrome Page)
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
  // 📝 PERSONA JSON BUILDER & VALIDATOR (Chrome Page)
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
  // 🖥️ AX INTERCEPTION / CLIPBOARD SIMULATOR (macOS Page)
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
      
      const targetLogs = logsData[mode];
      
      targetLogs.forEach(log => {
        const timer = setTimeout(() => {
          const logDiv = document.createElement('div');
          logDiv.className = `log-entry ${log.type}`;
          
          let icon = "→";
          if (log.type === "success") icon = "✓";
          if (log.type === "warning") icon = "⚠";
          
          logDiv.innerHTML = `
            <span class="log-entry-icon">${icon}</span>
            <span class="log-entry-text">${log.text}</span>
          `;
          
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
  // 📊 WORKLOAD CIRCULAR GAUGE SPEEDOMETER (macOS Page)
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
      const data = workloadData[state];
      
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
  // ⌨️ INTERACTIVE KEYBOARD SHORTCUT TRAINING
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
        const keyObj = keyboardKeys[keyName.trim().toLowerCase()];
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
  // 📋 CLICK-TO-COPY TERMINAL CLIPBOARD UTILITY
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

});
