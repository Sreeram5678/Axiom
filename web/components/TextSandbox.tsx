"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { optimizeText } from "@/utils/interceptorMap";
import { useMobileDetect } from "@/hooks/useMobileDetect";

interface TextSandboxProps {
  onTextHover: (text: string | null, optimized: string | null) => void;
}

export function TextSandbox({ onTextHover }: TextSandboxProps) {
  const [inputText, setInputText] = useState("");
  const [optimizedText, setOptimizedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useMobileDetect();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (text.trim()) {
      setIsProcessing(true);
      // Simulate processing delay
      setTimeout(() => {
        setOptimizedText(optimizeText(text));
        setIsProcessing(false);
      }, 300);
    } else {
      setOptimizedText("");
    }
  };

  const handleInputMouseEnter = () => {
    if (inputText && optimizedText) {
      onTextHover(inputText, optimizedText);
    }
  };

  const handleInputMouseLeave = () => {
    onTextHover(null, null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto px-4"
    >
      <div className="glass glass-secondary rounded-lg p-8">
        <h3 className="text-2xl font-semibold text-foreground mb-2">
          Try it yourself
        </h3>
        <p className="text-foreground-secondary text-sm mb-8">
          See Axiom optimize your text in real-time. Hover over the input to
          trigger the cursor HUD.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-foreground-secondary uppercase tracking-wide">
              Your Text
            </label>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onMouseEnter={!isMobile ? handleInputMouseEnter : undefined}
              onMouseLeave={!isMobile ? handleInputMouseLeave : undefined}
              placeholder="Paste your text, code, or prompt here..."
              className="w-full h-40 bg-background-secondary border border-border-light rounded-md p-4 text-sm text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary focus:ring-opacity-30 resize-none transition-colors"
            />
          </div>

          {/* Output */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                Optimized
              </label>
              {isProcessing && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5"
                >
                  <div className="w-full h-full border-1.5 border-transparent border-t-accent-secondary rounded-full" />
                </motion.div>
              )}
            </div>
            <div className="w-full h-40 bg-background-secondary border border-border-light rounded-md p-4 text-accent-secondary overflow-y-auto transition-colors">
              {optimizedText ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm leading-relaxed"
                >
                  {optimizedText}
                </motion.p>
              ) : (
                <p className="text-xs text-foreground-tertiary">
                  {isProcessing ? "Optimizing..." : "Optimized text will appear here"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Copy Button */}
        {optimizedText && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => {
              navigator.clipboard.writeText(optimizedText);
            }}
            className="mt-6 px-4 py-2 bg-accent-secondary text-background rounded-md font-medium text-xs hover:bg-accent-secondary-light transition-colors"
          >
            Copy optimized text
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
