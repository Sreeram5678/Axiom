"use client";

import { motion } from "framer-motion";

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border-light">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo & Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <div className="w-7 h-7 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-base font-semibold text-foreground">Axiom</span>
        </motion.div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-12">
          {[
            { label: "Features", href: "#features" },
            { label: "How it Works", href: "#how" },
            { label: "FAQ", href: "#faq" },
          ].map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              className="text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors relative group"
              whileHover={{ scale: 1.02 }}
            >
              {item.label}
              <motion.div
                className="absolute bottom-0 left-0 h-px bg-accent-secondary w-0 group-hover:w-full transition-all duration-300"
              />
            </motion.a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2.5"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:inline-flex px-4 py-2 text-xs font-medium text-foreground-secondary hover:text-accent-secondary transition-colors"
          >
            macOS
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 bg-accent-primary text-white rounded-md text-xs font-medium hover:bg-accent-primary-dark transition-colors"
          >
            Chrome
          </motion.a>
        </motion.div>
      </div>
    </header>
  );
}
