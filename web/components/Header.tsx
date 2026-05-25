"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function Header() {
  const [isHovering, setIsHovering] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 glass border-b border-accent-violet border-opacity-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Logo & Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-accent-violet to-accent-teal rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">Ω</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">Axiom</h1>
            <p className="text-xs text-foreground-tertiary">Prompt Suite</p>
          </div>
        </motion.div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Features", href: "#features" },
            { label: "How it Works", href: "#how" },
            { label: "FAQ", href: "#faq" },
          ].map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              onMouseEnter={() => setIsHovering(item.label)}
              onMouseLeave={() => setIsHovering(null)}
              className="text-sm text-foreground-secondary hover:text-accent-teal transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              {item.label}
              {isHovering === item.label && (
                <motion.div
                  layoutId="underline"
                  className="h-0.5 bg-accent-teal"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:inline-block px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-accent-teal transition-colors"
          >
            macOS
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-accent-violet text-white rounded-lg text-sm font-medium hover:bg-accent-violet-dark transition-colors"
          >
            Chrome Extension
          </motion.a>
        </motion.div>
      </div>
    </header>
  );
}
