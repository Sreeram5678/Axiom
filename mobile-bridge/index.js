export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response("Error: GEMINI_API_KEY environment variable is not set.", {
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Route: /optimize (GET)
    if (url.pathname === "/optimize") {
      const draftText = url.searchParams.get("text");
      if (!draftText) {
        return new Response("Error: Missing 'text' parameter in query.", { status: 400 });
      }

      const prompt = `System Directive: You are the Axiom Prompt Optimizer. Your task is to take the user's draft prompt and rewrite/expand it into a highly effective, clear, and structured prompt. IMPORTANT: You must integrate the user's specific subject matter directly into the output prompt (e.g., if they ask about 'quantum computing', write a detailed prompt specifically focused on explaining quantum computing). Do NOT output a generic template or ask for inputs. Output ONLY the finalized, optimized prompt itself. Do not include conversational intro/outro.\n\nUser Draft:\n${draftText}`;

      return await callGeminiAPI(prompt, apiKey);
    }

    // Route: /reply (POST)
    if (url.pathname === "/reply" && request.method === "POST") {
      const ocrText = await request.text();
      if (!ocrText) {
        return new Response("Error: Empty request body. Send raw OCR text.", { status: 400 });
      }

      const prompt = `System Directive: You are Axiom Mobile, an ambient conversation assistant. Below is a raw OCR text dump of a phone chat screen. Parse the transcript to identify the last incoming message. Draft a contextually accurate, natural reply. If the user has started a draft, complete their thought. Match the tone of the conversation. Output ONLY the response text to be copied.\n\nOCR Transcript:\n${ocrText}`;

      return await callGeminiAPI(prompt, apiKey);
    }

    // Fallback info route
    return new Response(
      "Axiom Mobile Worker Bridge is Online.\n\nRoutes:\n- GET /optimize?text=<prompt>\n- POST /reply (Send raw OCR text as body)",
      { headers: { "Content-Type": "text/plain" } }
    );
  }
};

async function callGeminiAPI(prompt, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      return new Response(`Gemini API Error: ${res.statusText}. ${JSON.stringify(errorJson)}`, { status: 502 });
    }

    const data = await res.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      return new Response("Error: Empty completion or unexpected JSON structure from Gemini API.", { status: 502 });
    }

    return new Response(resultText.trim(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(`Server error calling Gemini API: ${err.message}`, { status: 500 });
  }
}
