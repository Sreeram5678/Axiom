/**
 * Hardcoded optimization mappings for Axiom landing page elements
 * Maps original text to optimized/polished versions
 */
export const interceptorMap: Record<string, string> = {
  // Hero section
  "Optimize prompts in-place, system-wide, instantly.": "✨ Seamless Optimization: Transform your prompts instantly across any application without disruption.",
  "The Unified Prompt Suite": "🎯 The Unified Prompt Suite: All-in-one intelligent optimization engine for your workflows.",
  "Download for macOS": "📱 Get Axiom for macOS: Professional-grade optimization at your fingertips.",
  "Install Chrome Extension": "🔧 Install Axiom Extension: Bring optimization to every corner of your workflow.",

  // Feature cards
  "0.0% Idle CPU": "⚡ Zero Overhead Processing: Leverages native event hooks for imperceptible resource usage.",
  "On-Device Sovereign AI": "🔒 Sovereign Intelligence: All processing stays on your machine. Your data, your control.",
  "Military-Grade Sync": "🛡️ Enterprise-Grade Security: End-to-end encrypted synchronization across all your devices.",
  "Real-time text optimization": "🚀 Real-time Transformation: Watch your writing improve as you type, powered by advanced algorithms.",
  "Instant prompt rewriting": "✅ Instant Refinement: Axiom rewrites your prompts in milliseconds, not seconds.",
  "Cross-platform integration": "🌐 Everywhere You Work: Seamlessly integrated into your favorite applications and platforms.",

  // Common phrases
  "Optimize": "Enhance & Perfect",
  "Fast": "Lightning Quick",
  "Secure": "Completely Private",
  "Easy": "Effortless",
  "Free": "No Cost to Get Started",

  // CTA buttons
  "Get Started": "Begin Your Journey",
  "Learn More": "Discover the Details",
  "Try Now": "Experience the Magic",
};

/**
 * Simulated AI optimization for custom user input
 * Enhances text by adding action verbs, removing redundancy, and improving clarity
 */
export function optimizeText(text: string): string {
  if (!text.trim()) return "";

  // Get optimization from map if exists (case-insensitive)
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(interceptorMap)) {
    if (key.toLowerCase() === lowerText) {
      return value;
    }
  }

  // Mock optimization algorithm for custom text
  let optimized = text.trim();

  // Remove filler words
  const fillers = ["very", "really", "quite", "somewhat", "maybe", "perhaps"];
  fillers.forEach((filler) => {
    optimized = optimized.replace(new RegExp(`\\b${filler}\\s+`, "gi"), "");
  });

  // Add emphasis to action verbs
  const actionVerbs = [
    "enable",
    "make",
    "create",
    "build",
    "develop",
    "provide",
    "deliver",
    "transform",
  ];
  actionVerbs.forEach((verb) => {
    const regex = new RegExp(`\\b(${verb}[a-z]*)\\b`, "gi");
    optimized = optimized.replace(regex, (match) => `✨ ${match}`);
  });

  // Capitalize after punctuation
  optimized = optimized.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => {
    return p1 + p2.toUpperCase();
  });

  // Add finishing touch
  if (!optimized.endsWith(".") && !optimized.endsWith("!") && !optimized.endsWith("?")) {
    optimized = optimized.trim() + ".";
  }

  return optimized || text;
}
