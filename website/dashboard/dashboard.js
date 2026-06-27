// Axiom Dashboard JavaScript Controller
// Manages data storage (LocalStorage), Chart.js renderings, log filters, diffs, and configs.

(function () {
  // --- Constants & Configs ---
  const LOGS_STORAGE_KEY = 'axiom_prompt_logs';
  const PERSONAS_STORAGE_KEY = 'axiom_custom_personas';

  // Core Chart Colors (Zinc / HSL gradients matching dark theme)
  const colors = {
    red: '#e60023',
    redHover: '#ad0018',
    green: '#10b981',
    amber: '#f59e0b',
    indigo: '#6366f1',
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    borderLight: '#e4e4e7',
    borderDark: '#27272a',
    textLight: '#111111',
    textDark: '#f4f4f5'
  };

  // --- Default Personas ---
  const defaultPersonas = [
    { id: 'analyst', name: 'Optimize Prompt', desc: 'Inject context structure & analytical metrics', instruct: 'Optimize the prompt to request structured data, clear logical assumptions, key performance indicators, comparative frameworks, and detailed analytical breakdowns.' },
    { id: 'engineer', name: 'Engineer Mode', desc: 'Optimize for robust code & edge cases', instruct: 'Optimize the prompt to request high-quality, production-grade technical code or architecture designs. Seek edge-case handling, error management, Big O analysis, and modular patterns.' },
    { id: 'proofread', name: 'Proofread Text', desc: 'Fix typing grammar & sentence flow', instruct: 'Fix spelling mistakes, grammar errors, punctuation, and syntax issues. Improve sentence flow and readability without changing the core factual information.' },
    { id: 'rewrite', name: 'Rewrite & Elevate', desc: 'Enhance vocabulary & style elegantly', instruct: 'Rewrite the text to make it extremely clear, professional, elegant, and persuasive. Elevate the tone and vocabulary while preserving all details.' },
    { id: 'summarize', name: 'Summarize Text', desc: 'Condense text to its core essence', instruct: 'Condense the provided text to its absolute core essence, removing fluff while fully preserving all critical facts, data points, and context.' }
  ];

  // --- Mock Logs Generator ---
  function generateMockLogs() {
    const rawInputs = [
      "create a function to parse query params",
      "tell me about postgreSQL indexes",
      "fix grammar: he dont go to school yesterday because he was sick",
      "explain microservices vs monolithic",
      "write a summary of the quarterly financial statement showing 12% revenue growth and 5% overhead decrease",
      "make this email sound more professional: hey, need you to review the mockups by tonight, thanks",
      "design a database schema for an e-commerce shopping cart",
      "write a script to scrape titles from a webpage",
      "how does garbage collection work in java",
      "summarize this paragraph about dark matter and expansion of universe",
      "help me formulate a query to delete duplicate rows keeping oldest id",
      "write a short prompt to generate a logo design"
    ];

    const optimizedOutputs = {
      analyst: (input) => `<system_instruction>You are a master Prompt Engineer specializing in business analysis and structured data.</system_instruction>\n<context>\n- Input Query: ${input}\n</context>\n<instructions>\nOptimize the prompt to output structured comparison tables, KPIs, overhead assumptions, and clear business metrics.\n</instructions>`,
      engineer: (input) => `<system_instruction>You are a Principal Software Architect.</system_instruction>\n<context>\n- Task: ${input}\n</context>\n<instructions>\nOptimize to request high-quality code. The response MUST include: edge-case analysis, error handling, Big O runtime complexity, modular patterns, and docstrings.\n</instructions>`,
      proofread: (input) => `Corrected Text:\n"He didn't go to school yesterday because he was sick."`,
      rewrite: (input) => `Professional Version:\n"Could you please review the design mockups by the end of the day? Thank you for your assistance."`,
      summarize: (input) => `Summary:\n- Revenue growth: +12% this quarter.\n- Operational overhead: -5%.\n- Overall margins increased.`
    };

    const modes = ['analyst', 'engineer', 'proofread', 'rewrite', 'summarize'];
    const logs = [];
    const now = new Date();

    for (let i = 0; i < 28; i++) {
      const date = new Date();
      date.setDate(now.getDate() - Math.floor(Math.random() * 7));
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const mode = modes[Math.floor(Math.random() * modes.length)];
      const input = rawInputs[Math.floor(Math.random() * rawInputs.length)];
      const output = optimizedOutputs[mode] ? optimizedOutputs[mode](input) : `Optimized: ${input}`;
      
      const isLocal = Math.random() > 0.4;
      const latency = isLocal ? Math.floor(Math.random() * 150) + 30 : Math.floor(Math.random() * 1200) + 400;
      const cost = isLocal ? 0.0 : (Math.random() * 0.00018 + 0.00004);

      logs.push({
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        timestamp: date.toISOString(),
        mode: mode,
        method: isLocal ? 'On-Device Nano' : 'Cloud API',
        input: input,
        output: output,
        latency: latency,
        cost: cost
      });
    }

    // Sort by timestamp descending
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // --- Initializing State ---
  let logs = [];
  let personas = [];
  let extensionActive = false;

  // Function to save state (writes to extension if active, falls back to localStorage)
  function saveState() {
    if (extensionActive) {
      // Map personas to the extension's customModes format
      const customModes = personas.map(p => ({
        id: p.id,
        name: p.name,
        description: p.desc,
        systemInstruction: p.instruct
      }));
      // Map dashboard logs structure to the extension's promptHistory format
      const promptHistory = logs.map(l => ({
        id: l.id,
        timestamp: new Date(l.timestamp).getTime(),
        rawPrompt: l.input,
        optimizedPrompt: l.output,
        modeId: l.mode,
        modeName: l.mode.charAt(0).toUpperCase() + l.mode.slice(1),
        method: l.method,
        latency: l.latency,
        cost: l.cost
      }));
      window.postMessage({
        type: 'AXIOM_SAVE_STORED_DATA',
        promptHistory,
        customModes
      }, '*');
    } else {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
      localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas));
    }
  }

  // Load state function
  function loadStateFromLocalStorage() {
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    if (storedLogs === null) {
      logs = [];
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    } else {
      logs = JSON.parse(storedLogs);
    }
    personas = JSON.parse(localStorage.getItem(PERSONAS_STORAGE_KEY)) || [];
    if (personas.length === 0) {
      personas = defaultPersonas;
      localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas));
    }
    updateKPIs();
    initCharts();
    renderLogsTable();
    renderPersonasList();
  }

  // Check for the extension bridge
  let extensionChecked = false;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data && event.data.type === 'AXIOM_EXTENSION_BRIDGE_READY') {
      window.postMessage({ type: 'AXIOM_GET_STORED_DATA' }, '*');
    }

    if (event.data && event.data.type === 'AXIOM_STORED_DATA_RESPONSE') {
      extensionChecked = true;
      if (event.data.success) {
        extensionActive = true;
        console.log("[Axiom Dashboard] Connected to extension storage.");
        
        // Map promptHistory logs to dashboard format
        logs = (event.data.promptHistory || []).map(item => {
          const isNano = (item.selectedModel && item.selectedModel.includes('nano')) || item.method === 'On-Device Nano';
          const latency = item.latency || Math.floor(Math.random() * 200) + 100;
          const cost = item.cost !== undefined ? item.cost : (isNano ? 0 : 0.00008);
          const method = item.method || (isNano ? 'On-Device Nano' : 'Cloud API');
          return {
            id: item.id || 'log-' + Math.random().toString(36).substr(2, 9),
            timestamp: typeof item.timestamp === 'number' ? new Date(item.timestamp).toISOString() : (item.timestamp || new Date().toISOString()),
            mode: item.modeId || item.mode || 'general',
            method: method,
            input: item.rawPrompt || item.input || '',
            output: item.optimizedPrompt || item.output || '',
            latency: latency,
            cost: cost
          };
        });

        // Map customModes to personas
        const extPersonas = event.data.customModes || [];
        if (extPersonas.length === 0) {
          personas = defaultPersonas;
          saveState();
        } else {
          personas = extPersonas.map(m => ({
            id: m.id,
            name: m.name,
            desc: m.description || m.desc || '',
            instruct: m.systemInstruction || m.instruct || ''
          }));
        }
      } else {
        extensionActive = false;
        console.warn("[Axiom Dashboard] Extension error response, falling back to LocalStorage.");
        loadStateFromLocalStorage();
      }

      updateKPIs();
      initCharts();
      renderLogsTable();
      renderPersonasList();
    }
  });

  // Trigger check
  window.postMessage({ type: 'AXIOM_GET_STORED_DATA' }, '*');

  // If no response from extension within 250ms, fall back to LocalStorage
  setTimeout(() => {
    if (!extensionChecked) {
      extensionChecked = true;
      extensionActive = false;
      console.log("[Axiom Dashboard] Extension bridge timeout, using LocalStorage.");
      loadStateFromLocalStorage();
    }
  }, 250);

  // Chart instances
  let timelineChart = null;
  let personasChart = null;

  // --- UI Elements ---
  const totalOptsEl = document.getElementById('kpi-total-opts');
  const totalOptsTrendEl = document.getElementById('kpi-total-opts-trend');
  const totalCharsEl = document.getElementById('kpi-total-chars');
  const charsRatioEl = document.getElementById('kpi-chars-ratio');
  const costSavedEl = document.getElementById('kpi-cost-saved');
  const localRatioEl = document.getElementById('kpi-local-ratio');

  const searchInput = document.getElementById('log-search-input');
  const modeFilter = document.getElementById('log-mode-filter');
  const tableBody = document.getElementById('history-table-body');
  const emptyState = document.getElementById('history-empty-state');

  const personasListEl = document.getElementById('personas-list');
  const personaForm = document.getElementById('persona-config-form');
  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  const resetDemoBtn = document.getElementById('btn-reset-demo');

  // --- Helpers ---
  function getTheme() {
    return document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  }

  // --- Calculations & KPI Updates ---
  function updateKPIs() {
    // 1. Total Optimizations
    totalOptsEl.textContent = logs.length;
    // Calculate simulated trend (e.g. percentage of total optimizations done in last 3 days)
    const recentCount = logs.filter(l => {
      const diffTime = Math.abs(new Date() - new Date(l.timestamp));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).length;
    const trendPercent = Math.round((recentCount / (logs.length || 1)) * 100);
    totalOptsTrendEl.textContent = `+${trendPercent}% active recently`;

    // 2. Characters processed
    let rawCharCount = 0;
    let optCharCount = 0;
    logs.forEach(l => {
      rawCharCount += l.input.length;
      optCharCount += l.output.length;
    });
    totalCharsEl.textContent = optCharCount.toLocaleString();
    const ratio = (optCharCount / (rawCharCount || 1)).toFixed(1);
    charsRatioEl.textContent = `Avg. enrichment: ${ratio}x size`;

    // 3. Est. Cost Saved
    // Local Nano runs cost $0, Cloud API costs (simulated as cost saved compared to commercial paywalls)
    let totalSaved = 0.0;
    logs.forEach(l => {
      // Base saving: each optimization saves roughly $0.0015 compared to expensive custom models
      totalSaved += (l.method === 'On-Device Nano') ? 0.0020 : 0.0008;
    });
    costSavedEl.textContent = `$${totalSaved.toFixed(4)}`;

    // 4. Local Router Rate
    const localCount = logs.filter(l => l.method === 'On-Device Nano').length;
    const localRatio = Math.round((localCount / (logs.length || 1)) * 100);
    localRatioEl.textContent = `${localRatio}%`;
  }

  // --- Chart.js Draw Functions ---
  function initCharts() {
    const theme = getTheme();
    const borderCol = theme === 'dark' ? colors.borderDark : colors.borderLight;
    const textCol = theme === 'dark' ? colors.textDark : colors.textLight;

    // Destory existing charts if active
    if (timelineChart) timelineChart.destroy();
    if (personasChart) personasChart.destroy();

    // 1. Timeline Chart Data Processing
    // Group optimizations by date (last 7 days)
    const dates = [];
    const dateCounts = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates.push(label);
      dateCounts[label] = 0;
    }

    logs.forEach(l => {
      const label = new Date(l.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (dateCounts[label] !== undefined) {
        dateCounts[label]++;
      }
    });

    const timelineCtx = document.getElementById('chart-timeline').getContext('2d');
    timelineChart = new Chart(timelineCtx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Optimizations',
          data: dates.map(d => dateCounts[d]),
          borderColor: colors.red,
          backgroundColor: 'rgba(230, 0, 35, 0.06)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: colors.red,
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            cornerRadius: 8,
            backgroundColor: theme === 'dark' ? '#1c1c1f' : '#ffffff',
            titleColor: theme === 'dark' ? '#ffffff' : '#111111',
            bodyColor: theme === 'dark' ? '#a1a1aa' : '#52525b',
            borderColor: borderCol,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: borderCol, drawBorder: false },
            ticks: { color: textCol, font: { family: 'Inter' } }
          },
          y: {
            grid: { color: borderCol, drawBorder: false },
            ticks: { color: textCol, stepSize: 1, font: { family: 'Inter' } }
          }
        }
      }
    });

    // 2. Persona Distribution Chart Data Processing
    const personaLabels = {
      analyst: 'Optimize Prompt',
      engineer: 'Engineer Mode',
      proofread: 'Proofread',
      rewrite: 'Rewrite',
      summarize: 'Summarize'
    };
    const personaCounts = { analyst: 0, engineer: 0, proofread: 0, rewrite: 0, summarize: 0 };
    
    logs.forEach(l => {
      if (personaCounts[l.mode] !== undefined) {
        personaCounts[l.mode]++;
      }
    });

    const activeModes = Object.keys(personaCounts).filter(k => personaCounts[k] > 0);

    const personasCtx = document.getElementById('chart-personas').getContext('2d');
    personasChart = new Chart(personasCtx, {
      type: 'doughnut',
      data: {
        labels: activeModes.map(m => personaLabels[m] || m),
        datasets: [{
          data: activeModes.map(m => personaCounts[m]),
          backgroundColor: [colors.red, colors.indigo, colors.green, colors.purple, colors.cyan],
          borderColor: theme === 'dark' ? '#1c1c1f' : '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textCol,
              font: { family: 'Inter', size: 11 },
              boxWidth: 10,
              padding: 12
            }
          },
          tooltip: {
            padding: 10,
            cornerRadius: 8,
            backgroundColor: theme === 'dark' ? '#1c1c1f' : '#ffffff',
            titleColor: theme === 'dark' ? '#ffffff' : '#111111',
            bodyColor: theme === 'dark' ? '#a1a1aa' : '#52525b',
            borderColor: borderCol,
            borderWidth: 1
          }
        },
        cutout: '70%'
      }
    });
  }

  // --- Logs Table Rendering & Filters ---
  function renderLogsTable() {
    const searchVal = searchInput.value.toLowerCase().trim();
    const selectedMode = modeFilter.value;

    const filtered = logs.filter(l => {
      const matchesSearch = l.input.toLowerCase().includes(searchVal) || l.output.toLowerCase().includes(searchVal);
      const matchesMode = selectedMode === 'all' || l.mode === selectedMode;
      return matchesSearch && matchesMode;
    });

    tableBody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    filtered.forEach(l => {
      const date = new Date(l.timestamp);
      const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
                            date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

      const modeBadgeStyles = {
        analyst: { bg: 'rgba(230, 0, 35, 0.1)', fg: colors.red, label: 'Optimize Prompt' },
        engineer: { bg: 'rgba(99, 102, 241, 0.1)', fg: colors.indigo, label: 'Engineer' },
        proofread: { bg: 'rgba(16, 185, 129, 0.1)', fg: colors.green, label: 'Proofread' },
        rewrite: { bg: 'rgba(139, 92, 246, 0.1)', fg: colors.purple, label: 'Rewrite' },
        summarize: { bg: 'rgba(6, 182, 212, 0.1)', fg: colors.cyan, label: 'Summarize' }
      };

      const badge = modeBadgeStyles[l.mode] || { bg: 'rgba(255, 255, 255, 0.05)', fg: colors.textSecondary, label: l.mode };
      const methodColor = l.method === 'On-Device Nano' ? '#10b981' : '#a1a1aa';

      const tr = document.createElement('tr');
      tr.className = 'history-row';
      tr.style.cursor = 'pointer';
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.style.transition = 'var(--transition-fast)';
      tr.innerHTML = `
        <td style="padding: 14px 16px; color: var(--text-secondary); font-size: 0.85rem;">${formattedDate}</td>
        <td style="padding: 14px 16px;">
          <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: ${badge.bg}; color: ${badge.fg};">${badge.label}</span>
        </td>
        <td style="padding: 14px 16px; font-size: 0.8rem; font-weight: 500; color: ${methodColor};">
          ${l.method === 'On-Device Nano' ? '⚡ Nano' : '☁️ Cloud API'}
        </td>
        <td style="padding: 14px 16px; color: var(--text-primary); font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(l.input)}
        </td>
        <td style="padding: 14px 16px; text-align: right; font-size: 0.85rem; font-weight: 500; font-family: 'JetBrains Mono', monospace;">
          <div style="color: var(--text-primary);">${l.latency}ms</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary);">${l.cost === 0 ? 'Free' : '$' + l.cost.toFixed(5)}</div>
        </td>
        <td style="padding: 14px 16px; text-align: center;">
          <button class="expand-btn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: inline-flex; align-items: center; transition: transform 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </td>
      `;

      // Set hover backgrounds inline to honor light/dark theme variables easily
      tr.addEventListener('mouseenter', () => {
        tr.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
      });
      tr.addEventListener('mouseleave', () => {
        tr.style.backgroundColor = 'transparent';
      });

      // Expand/Collapse Details Row
      tr.addEventListener('click', (e) => {
        // Prevent click trigger if they clicked inside expanded panels
        if (e.target.closest('.details-panel')) return;

        const nextRow = tr.nextElementSibling;
        const icon = tr.querySelector('.expand-btn');

        if (nextRow && nextRow.classList.contains('details-row')) {
          nextRow.remove();
          icon.style.transform = 'rotate(0deg)';
        } else {
          // Collapse any other open rows first
          document.querySelectorAll('.details-row').forEach(row => {
            const prev = row.previousElementSibling;
            if (prev) {
              const prevIcon = prev.querySelector('.expand-btn');
              if (prevIcon) prevIcon.style.transform = 'rotate(0deg)';
            }
            row.remove();
          });

          // Insert Details sub-row
          const detailsTr = document.createElement('tr');
          detailsTr.className = 'details-row';
          detailsTr.style.backgroundColor = getTheme() === 'dark' ? '#131316' : '#f9f9fb';
          detailsTr.innerHTML = `
            <td colspan="6" style="padding: 24px; border-bottom: 1px solid var(--border-color);" class="details-panel">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- Raw Input -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Raw Prompt</span>
                  <div style="padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-primary); white-space: pre-wrap; min-height: 120px;">${escapeHtml(l.input)}</div>
                  <button class="btn btn-secondary btn-copy" data-text="${encodeURIComponent(l.input)}" style="align-self: flex-end; padding: 6px 12px; font-size: 0.75rem; border-radius: 4px; margin-top: 6px;">Copy Raw</button>
                </div>
                <!-- Optimized Directive -->
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-red); text-transform: uppercase;">Enriched Directive</span>
                  <div class="diff-viewer-formatted" style="padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-primary); white-space: pre-wrap; min-height: 120px; line-height: 1.5;">${formatXmlTags(l.output)}</div>
                  <button class="btn btn-primary btn-copy" data-text="${encodeURIComponent(l.output)}" style="align-self: flex-end; padding: 6px 12px; font-size: 0.75rem; border-radius: 4px; margin-top: 6px;">Copy Directive</button>
                </div>
              </div>
            </td>
          `;
          tr.after(detailsTr);
          icon.style.transform = 'rotate(180deg)';

          // Bind Copy Buttons
          detailsTr.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
              const text = decodeURIComponent(btn.getAttribute('data-text'));
              navigator.clipboard.writeText(text).then(() => {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.opacity = '0.7';
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.style.opacity = '1';
                }, 1500);
              });
            });
          });
        }
      });

      tableBody.appendChild(tr);
    });
  }

  // Escape HTML helper
  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Visual highlights for system / XML tags in diff
  function formatXmlTags(text) {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/(&lt;system_instruction&gt;[\s\S]*?&lt;\/system_instruction&gt;)/g, '<span style="color: #f59e0b; font-weight: 500;">$1</span>')
      .replace(/(&lt;context&gt;[\s\S]*?&lt;\/context&gt;)/g, '<span style="color: #6366f1; font-weight: 500;">$1</span>')
      .replace(/(&lt;instructions&gt;[\s\S]*?&lt;\/instructions&gt;)/g, '<span style="color: #e60023; font-weight: 500;">$1</span>')
      .replace(/(&lt;constraints&gt;[\s\S]*?&lt;\/constraints&gt;)/g, '<span style="color: #8b5cf6; font-weight: 500;">$1</span>')
      .replace(/(&lt;[a-zA-Z0-9_\-]+&gt;|&lt;\/[a-zA-Z0-9_\-]+&gt;)/g, '<span style="color: var(--accent-red); font-weight: bold;">$1</span>');
  }

  // --- Persona Customizer List & Form Handlers ---
  function renderPersonasList() {
    personasListEl.innerHTML = '';
    
    personas.forEach(p => {
      const modeStyles = {
        analyst: { bg: 'rgba(230, 0, 35, 0.1)', fg: colors.red },
        engineer: { bg: 'rgba(99, 102, 241, 0.1)', fg: colors.indigo },
        proofread: { bg: 'rgba(16, 185, 129, 0.1)', fg: colors.green },
        rewrite: { bg: 'rgba(139, 92, 246, 0.1)', fg: colors.purple },
        summarize: { bg: 'rgba(6, 182, 212, 0.1)', fg: colors.cyan }
      };

      const colorset = modeStyles[p.id] || { bg: 'rgba(255, 255, 255, 0.05)', fg: '#a1a1aa' };

      const card = document.createElement('div');
      card.className = 'board-card';
      card.style.padding = '16px';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';
      card.style.transition = 'var(--transition-fast)';
      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${colorset.fg}; shadow: 0 0 6px ${colorset.fg};"></div>
          <div>
            <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 2px;">${escapeHtml(p.name)}</h4>
            <p style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(p.desc)}</p>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-edit" data-id="${p.id}" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem; font-weight: 600; padding: 4px 8px; transition: color 0.2s;">Edit</button>
          ${!['analyst', 'engineer', 'proofread', 'rewrite', 'summarize'].includes(p.id) ? `
            <button class="btn-delete" data-id="${p.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem; font-weight: 600; padding: 4px 8px; transition: opacity 0.2s;">Delete</button>
          ` : ''}
        </div>
      `;

      // Event Listeners for Edit & Delete
      card.querySelector('.btn-edit').addEventListener('click', () => loadPersonaIntoForm(p));
      const deleteBtn = card.querySelector('.btn-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deletePersona(p.id));
      }

      personasListEl.appendChild(card);
    });
  }

  function loadPersonaIntoForm(persona) {
    document.getElementById('form-title').textContent = `Edit Persona: ${persona.name}`;
    document.getElementById('persona-edit-id').value = persona.id;
    
    const idInput = document.getElementById('persona-input-id');
    idInput.value = persona.id;
    // Lock ID field for default system modes
    if (['analyst', 'engineer', 'proofread', 'rewrite', 'summarize'].includes(persona.id)) {
      idInput.readOnly = true;
      idInput.style.opacity = '0.5';
    } else {
      idInput.readOnly = false;
      idInput.style.opacity = '1';
    }

    document.getElementById('persona-input-name').value = persona.name;
    document.getElementById('persona-input-desc').value = persona.desc;
    document.getElementById('persona-input-instruct').value = persona.instruct;
  }

  function resetForm() {
    document.getElementById('form-title').textContent = 'Add / Edit Persona';
    document.getElementById('persona-edit-id').value = '';
    
    const idInput = document.getElementById('persona-input-id');
    idInput.value = '';
    idInput.readOnly = false;
    idInput.style.opacity = '1';

    personaForm.reset();
  }

  function deletePersona(id) {
    if (confirm('Are you sure you want to delete this custom persona?')) {
      personas = personas.filter(p => p.id !== id);
      saveState();
      renderPersonasList();
      resetForm();
    }
  }

  // Form Submit Handler
  personaForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const editId = document.getElementById('persona-edit-id').value;
    const id = document.getElementById('persona-input-id').value.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '');
    const name = document.getElementById('persona-input-name').value.trim();
    const desc = document.getElementById('persona-input-desc').value.trim();
    const instruct = document.getElementById('persona-input-instruct').value.trim();

    if (!id || !name || !desc || !instruct) return;

    if (editId) {
      // Update
      const index = personas.findIndex(p => p.id === editId);
      if (index !== -1) {
        personas[index] = { ...personas[index], name, desc, instruct };
      }
    } else {
      // Add
      if (personas.some(p => p.id === id)) {
        alert('A persona with this ID already exists. Please choose a unique ID.');
        return;
      }
      personas.push({ id, name, desc, instruct });
    }

    saveState();
    renderPersonasList();
    resetForm();
  });

  // --- Initial Bindings ---
  searchInput.addEventListener('input', renderLogsTable);
  modeFilter.addEventListener('change', renderLogsTable);
  cancelEditBtn.addEventListener('click', resetForm);

  // Reset Demo Data
  resetDemoBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all prompt logs to their default demo states? This will regenerate your analytics charts.')) {
      logs = generateMockLogs();
      personas = defaultPersonas;
      saveState();
      
      updateKPIs();
      initCharts();
      renderLogsTable();
      renderPersonasList();
      resetForm();
    }
  });

  // Listen to dark mode toggles to update chart fonts/grids automatically
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      // Small timeout to allow DOM changes to settle
      setTimeout(() => {
        initCharts();
        renderLogsTable();
      }, 100);
    });
  }

  // --- Bootstrapping Execution ---
  updateKPIs();
  initCharts();
  renderLogsTable();
  renderPersonasList();
})();
