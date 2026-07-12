/**
 * Formats and sends the prompt optimization request to the Gemini API.
 * 
 * @param {Object} params
 * @param {string} params.rawPrompt - The raw prompt to optimize.
 * @param {string} params.systemInstruction - The mode instructions to inject.
 * @param {string} params.apiKey - The Gemini API key.
 * @param {string} params.model - The Gemini model (e.g., gemini-3.1-flash-lite).
 * @param {number} [params.timeoutMs=15000] - Timeout in milliseconds.
 * @returns {Promise<string>} The optimized prompt.
 */
export async function optimizePrompt({
  rawPrompt,
  systemInstruction,
  apiKey,
  model = "gemini-3.5-flash",
  length = "medium",
  timeoutMs = 60000,
  onChunk = null
}) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API Key is missing. Please configure your Gemini API Key in the Settings tab.");
  }
  
  if (!rawPrompt || rawPrompt.trim() === "") {
    throw new Error("Input prompt is empty. Please enter a prompt to optimize.");
  }

  // Map length parameter to a detailed instructions directive
  let lengthDirective = "";
  if (length === "short") {
    lengthDirective = "The optimized prompt MUST be short, extremely concise, direct, and focused only on the absolute essentials. Strip away all unnecessary elaboration, side details, or verbose phrasing.";
  } else if (length === "detailed") {
    lengthDirective = "The optimized prompt MUST be highly detailed, comprehensive, and thorough. Provide rich context, explicit parameters, background, and clear step-by-step instructions.";
  } else {
    // medium
    lengthDirective = "The optimized prompt MUST be of medium length, balancing clear context, structural clarity, and efficient detail without being overly brief or excessively wordy.";
  }

  // Map length parameter to a maxOutputTokens configuration
  let maxOutputTokens = 800;
  if (length === "short") {
    maxOutputTokens = 400;
  } else if (length === "detailed") {
    maxOutputTokens = 1500;
  }

  // Google Gemini API streamGenerateContent endpoint with alt=sse parameter for real-time streaming
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Please optimize the following raw prompt. Make it highly professional, effective, and detailed according to your persona rules. Provide only the clean, optimized prompt and nothing else.\n\nRaw prompt:\n"${rawPrompt}"`
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: `You are a master Prompt Engineer. Your task is to rewrite, refine, and optimize the user's prompt to achieve the highest quality response. Incorporate the following persona and guidelines:\n\n${systemInstruction}\n\n${lengthDirective}\n\nCRITICAL: Provide ONLY the optimized prompt. No preamble (e.g., 'Here is your optimized prompt:'), no conversational filler, no markdown code blocks surrounding the prompt (i.e. do not wrap the output in \`\`\` or \`\`\`text). Return it directly as clean plain text.`
        }
      ]
    },
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: maxOutputTokens
    }
  };

  const maxRetries = 2;
  let attempt = 0;
  let response = null;

  while (attempt <= maxRetries) {
    if (attempt > 0) {
      console.log(`[Axiom API] Retrying API request (Attempt ${attempt + 1}/${maxRetries + 1}) after transient error...`);
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let fetchError = null;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } catch (err) {
      fetchError = err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (fetchError) {
      if (fetchError.name === "AbortError") {
        throw new Error("API request timed out (60s limit reached). Please check your internet connection and try again.");
      }

      // If it's a network error and we have retries left, retry
      if (attempt < maxRetries) {
        attempt++;
        continue;
      }
      throw fetchError;
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }

      // Check if error is transient and we have retries left
      if ((response.status === 429 || response.status === 500 || response.status === 503) && attempt < maxRetries) {
        attempt++;
        continue;
      }

      // Handle specific API error statuses with friendly messaging
      if (response.status === 400) {
        throw new Error(`Bad Request: ${errorMessage}. Please check model selection or inputs.`);
      } else if (response.status === 403) {
        throw new Error("Invalid API Key. Please verify your Gemini API key in the Settings tab.");
      } else if (response.status === 429) {
        throw new Error("API Rate Limit Exceeded. You have made too many requests in a short time. Please wait a minute and try again.");
      } else if (response.status === 500 || response.status === 503) {
        throw new Error("Gemini Server Error. The API is temporarily unavailable. Please try again in a few moments.");
      } else {
        throw new Error(`API Error (${response.status}): ${errorMessage}`);
      }
    }

    break;
  }

  // Verify response body is readable
  if (!response || !response.body) {
    throw new Error("Unable to read streaming response body from Gemini API.");
  }

    // Set up standard stream decoder pipeline using direct TextDecoder and getReader
    const startTime = Date.now();
    console.log(`[Axiom API Debug] Starting stream reader at: ${startTime}`);
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedText = "";
    
    let i = 0;
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let startIndex = -1;
    let chunkCount = 0;

    while (true) {
      const readStart = Date.now();
      const { done, value } = await reader.read();
      const readEnd = Date.now();
      chunkCount++;
      
      console.log(`[Axiom API Debug] Read chunk #${chunkCount} in ${readEnd - readStart}ms. done=${done}, valueLength=${value ? value.length : 0}, timeSinceStart=${readEnd - startTime}ms`);
      
      let chunkStr = "";
      if (value) {
        chunkStr = decoder.decode(value, { stream: true });
      } else if (done) {
        chunkStr = decoder.decode(); // Flush any remaining decoder bytes
      }
      
      buffer += chunkStr;

      // Extract complete JSON objects from the streaming JSON array response
      while (i < buffer.length) {
        const char = buffer.charAt(i);
        if (escapeNext) {
          escapeNext = false;
          i++;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          i++;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          i++;
          continue;
        }
        if (!inString) {
          if (char === '{') {
            if (braceCount === 0) {
              startIndex = i;
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              const jsonStr = buffer.substring(startIndex, i + 1);
              try {
                const obj = JSON.parse(jsonStr);
                const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  accumulatedText += text;
                  if (onChunk) {
                    onChunk(text);
                  }
                }
              } catch (e) {
                console.error("Error parsing streaming JSON chunk:", e);
              }
              // Reset scan state on the remaining buffer substring
              buffer = buffer.substring(i + 1);
              i = 0;
              startIndex = -1;
              continue;
            }
          }
        }
        i++;
      }

      if (done) break;
    }

    // Decode final remaining bytes if any
    if (buffer && buffer.trim() !== "") {
      if (braceCount > 0 && startIndex !== -1) {
        try {
          const jsonStr = buffer.substring(startIndex);
          const closedJson = jsonStr + "}".repeat(braceCount);
          const obj = JSON.parse(closedJson);
          const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            accumulatedText += text;
            if (onChunk) {
              onChunk(text);
            }
          }
        } catch (e) {}
      }
    }

    if (!accumulatedText || accumulatedText.trim() === "") {
      throw new Error("Received an empty or malformed response from the Gemini API. Please try again.");
    }

    // Clean up any accidental markdown code blocks that the model might have returned despite the system instruction
    let optimizedText = accumulatedText.trim();
    if (optimizedText.startsWith("```")) {
      // Remove starting ```[language]
      optimizedText = optimizedText.replace(/^```[a-zA-Z]*\n?/, "");
      // Remove ending ```
      optimizedText = optimizedText.replace(/\n?```$/, "");
      optimizedText = optimizedText.trim();
    }

    return optimizedText;
}
