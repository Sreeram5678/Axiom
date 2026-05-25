"use client";

import { motion } from "framer-motion";
import { TextSandbox } from "./TextSandbox";
import { useRef, useState } from "react";

interface HeroProps {
  onTextHover: (text: string | null, optimized: string | null) => void;
}

export function Hero({ onTextHover }: HeroProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  const handleMouseEnter = (element: string, text: string) => {
    setHoveredElement(element);
    // Simulate optimization lookup
    const optimized =
      element === "heading"
        ? "✨ The Unified Prompt Suite: All-in-one intelligent optimization engine for your workflows."
        : "💡 Leverage sovereign AI to refine your prompts in-place across any application without friction.";
    onTextHover(text, optimized);
  };

  const handleMouseLeave = () => {
    setHoveredElement(null);
    onTextHover(null, null);
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 md:px-6 py-20 overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 2 }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-violet rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent-teal rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 glass glass-violet rounded-full"
        >
          <span className="w-2 h-2 bg-accent-teal rounded-full animate-pulse" />
          <span className="text-sm text-accent-teal font-medium">
            Now Available for macOS & Chrome
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          ref={headingRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onMouseEnter={() =>
            handleMouseEnter(
              "heading",
              "The Unified Prompt Suite"
            )
          }
          onMouseLeave={handleMouseLeave}
          className={`text-4xl md:text-6xl lg:text-7xl font-bold leading-tight bg-gradient-to-r from-foreground via-accent-violet to-accent-teal bg-clip-text text-transparent cursor-text transition-all ${
            hoveredElement === "heading" ? "opacity-80" : "opacity-100"
          }`}
        >
          The Unified Prompt Suite
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          ref={subtitleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onMouseEnter={() =>
            handleMouseEnter(
              "subtitle",
              "Optimize prompts in-place, system-wide, instantly."
            )
          }
          onMouseLeave={handleMouseLeave}
          className={`text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto leading-relaxed cursor-text transition-all ${
            hoveredElement === "subtitle" ? "opacity-80" : "opacity-100"
          }`}
        >
          Optimize prompts in-place, system-wide, instantly. Harness sovereign
          AI without leaving your workflow.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(167, 139, 250, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-accent-violet to-accent-violet-dark text-white rounded-lg font-semibold text-lg glow-violet transition-all"
          >
            Download for macOS
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(32, 201, 151, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 border-2 border-accent-teal text-accent-teal rounded-lg font-semibold text-lg hover:bg-accent-teal hover:text-background transition-all"
          >
            Install Chrome Extension
          </motion.a>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-24 h-1 bg-gradient-to-r from-accent-violet to-accent-teal rounded-full mx-auto"
        />
      </div>

      {/* TextSandbox */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="w-full mt-24"
      >
        <TextSandbox onTextHover={onTextHover} />
      </motion.div>
    </motion.section>
  );
}
