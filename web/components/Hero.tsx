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
      className="relative min-h-screen flex flex-col items-center justify-center px-4 md:px-6 py-20 overflow-hidden"
    >
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 2 }}
          className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-accent-primary rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.02 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-1/3 left-1/3 w-[600px] h-[600px] bg-accent-secondary rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-3xl mx-auto text-center space-y-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 glass glass-primary rounded-full text-xs"
        >
          <span className="w-1.5 h-1.5 bg-accent-secondary rounded-full animate-pulse" />
          <span className="text-foreground-secondary font-medium">
            Now available on macOS & Chrome
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
          className={`text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground cursor-text transition-opacity ${
            hoveredElement === "heading" ? "opacity-70" : "opacity-100"
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
          className={`text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto leading-relaxed cursor-text transition-opacity ${
            hoveredElement === "subtitle" ? "opacity-70" : "opacity-100"
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
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-8 py-3 bg-accent-primary text-white rounded-md font-medium text-base hover:bg-accent-primary-dark transition-colors glow-primary"
          >
            Download for macOS
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-8 py-3 border border-border-light text-foreground rounded-md font-medium text-base hover:bg-background-hover transition-colors"
          >
            Chrome Extension
          </motion.a>
        </motion.div>
      </div>

      {/* TextSandbox */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="w-full mt-32"
      >
        <TextSandbox onTextHover={onTextHover} />
      </motion.div>
    </motion.section>
  );
}
