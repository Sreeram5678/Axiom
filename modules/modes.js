export const DEFAULT_MODES = [
  {
    "id": "analyst",
    "name": "Analyst",
    "description": "Rigorous, structured data and deep analytical insights.",
    "systemInstruction": "Optimize the prompt to request structured data, clear logical assumptions, key performance indicators, comparative frameworks, and detailed analytical breakdowns. The output should balance quantitative facts with qualitative explanations, asking the AI to show its work, structure, and methodology step-by-step."
  },
  {
    "id": "engineer",
    "name": "Engineer",
    "description": "Precise technical logic, edge cases, and modern patterns.",
    "systemInstruction": "Optimize the prompt to request high-quality, production-grade technical code or architecture designs. The prompt should explicitly seek edge-case handling, robust error management, code efficiency/complexity analysis (Big O), modular design patterns, security considerations, and comprehensive comments or documentation."
  },
  {
    "id": "first-principles",
    "name": "First-Principles",
    "description": "Deconstructs topics to fundamental truths.",
    "systemInstruction": "Optimize the prompt to demand first-principles thinking. It must instruct the AI to deconstruct the query into its most fundamental, undisputed truths and build up a rigorous logical reasoning chain from the ground up, identifying and stripping away conventional assumptions, analogies, or heuristics."
  },
  {
    "id": "exec-summary",
    "name": "Exec-Summary",
    "description": "High-level strategic bullet points with zero fluff.",
    "systemInstruction": "Optimize the prompt to demand a high-level strategic executive summary. The prompt should ask for a structured output consisting of: a 2-sentence overarching synthesis, 3-5 bulleted key takeaways, critical strategic or financial impact assessments, next steps, and absolutely no filler or boilerplate introductions."
  }
];

/**
 * Retrieves the modes from chrome.storage.local.
 * Falls back to DEFAULT_MODES if none exist.
 */
export async function getModes() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['customModes'], (result) => {
        if (chrome.runtime.lastError) {
          console.warn("[Axiom Modes] Error reading local storage:", chrome.runtime.lastError.message);
          resolve(DEFAULT_MODES);
          return;
        }
        if (result && result.customModes) {
          resolve(result.customModes);
        } else {
          // Initialize with defaults if empty
          try {
            chrome.storage.local.set({ customModes: DEFAULT_MODES }, () => {
              if (chrome.runtime.lastError) {
                console.warn("[Axiom Modes] Error saving default modes:", chrome.runtime.lastError.message);
              }
            });
          } catch (innerErr) {
            console.warn("[Axiom Modes] Exception saving default modes:", innerErr.message);
          }
          resolve(DEFAULT_MODES);
        }
      });
    } catch (err) {
      console.warn("[Axiom Modes] Storage get exception:", err.message);
      resolve(DEFAULT_MODES);
    }
  });
}

/**
 * Validates and saves custom modes JSON string.
 * @param {string} jsonString - The raw JSON string from settings.
 * @returns {Promise<{success: boolean, error?: string, modes?: Array}>}
 */
export async function saveModes(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    
    if (!Array.isArray(parsed)) {
      throw new Error("Configuration must be a JSON array.");
    }
    
    for (let i = 0; i < parsed.length; i++) {
      const mode = parsed[i];
      if (!mode.id || typeof mode.id !== 'string') {
        throw new Error(`Item at index ${i} is missing a valid string 'id'.`);
      }
      if (!mode.name || typeof mode.name !== 'string') {
        throw new Error(`Item at index ${i} ('${mode.id}') is missing a valid string 'name'.`);
      }
      if (!mode.description || typeof mode.description !== 'string') {
        throw new Error(`Item at index ${i} ('${mode.id}') is missing a valid string 'description'.`);
      }
      if (!mode.systemInstruction || typeof mode.systemInstruction !== 'string') {
        throw new Error(`Item at index ${i} ('${mode.id}') is missing a valid string 'systemInstruction'.`);
      }
    }
    
    // Save to storage
    await new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ customModes: parsed }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
    
    return { success: true, modes: parsed };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Resets storage back to default modes.
 */
export async function resetModes() {
  try {
    await new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ customModes: DEFAULT_MODES }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn("[Axiom Modes] Reset modes failed:", err.message);
  }
  return DEFAULT_MODES;
}
