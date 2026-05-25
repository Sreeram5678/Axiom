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
      className="w-full max-w-4xl mx-auto"
    >
      <div className="glass glass-teal rounded-xl p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Try it on your own text
        </h3>
        <p className="text-foreground-secondary text-sm md:text-base mb-6">
          Hover over or interact with your text to see Axiom optimization in
          action.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground-secondary">
              Your Text
            </label>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onMouseEnter={!isMobile ? handleInputMouseEnter : undefined}
              onMouseLeave={!isMobile ? handleInputMouseLeave : undefined}
              placeholder="Paste your text, code, or prompt here..."
              className="w-full h-32 md:h-40 bg-background-secondary border border-accent-teal-light border-opacity-20 rounded-lg p-4 text-foreground placeholder-foreground-tertiary focus:outline-none focus:border-accent-teal focus:ring-2 focus:ring-accent-teal focus:ring-opacity-20 resize-none"
            />
          </div>

          {/* Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground-secondary">
                Optimized by Axiom
              </label>
              {isProcessing && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4"
                >
                  <div className="w-full h-full border-2 border-transparent border-t-accent-teal rounded-full" />
                </motion.div>
              )}
            </div>
            <div className="w-full h-32 md:h-40 bg-background-secondary border border-accent-violet-dark border-opacity-20 rounded-lg p-4 text-accent-teal overflow-y-auto">
              {optimizedText ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm md:text-base leading-relaxed"
                >
                  {optimizedText}
                </motion.p>
              ) : (
                <p className="text-sm text-foreground-tertiary">
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
            className="mt-4 px-4 py-2 bg-accent-teal text-background rounded-lg font-medium text-sm hover:bg-accent-teal-light transition-colors"
          >
            Copy Optimized Text
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
