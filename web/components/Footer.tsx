"use client";

import { motion } from "framer-motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border-light bg-background-secondary">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: false }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">Axiom</h3>
            </div>
            <p className="text-xs text-foreground-tertiary leading-relaxed">
              The Unified Prompt Suite. Optimize everywhere, instantly.
            </p>
          </motion.div>

          {/* Product */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: false }}
          >
            <h4 className="font-semibold text-foreground mb-4 text-sm">Product</h4>
            <ul className="space-y-2 text-xs">
              {["Features", "Pricing", "Security", "Roadmap"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-foreground-tertiary hover:text-accent-secondary transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: false }}
          >
            <h4 className="font-semibold text-foreground mb-4 text-sm">Company</h4>
            <ul className="space-y-2 text-xs">
              {["About", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-foreground-tertiary hover:text-accent-primary transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: false }}
          >
            <h4 className="font-semibold text-foreground mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-xs">
              {["Privacy", "Terms", "License", "Cookies"].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-foreground-tertiary hover:text-accent-secondary transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border-light my-8" />

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: false }}
          className="flex flex-col md:flex-row items-center justify-between text-xs text-foreground-tertiary"
        >
          <p>© {currentYear} Axiom. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-6 md:mt-0">
            {[
              { name: "Twitter", icon: "𝕏" },
              { name: "GitHub", icon: "⚙" },
              { name: "Discord", icon: "💬" },
            ].map((social) => (
              <motion.a
                key={social.name}
                href="#"
                whileHover={{ scale: 1.15 }}
                className="text-foreground-secondary hover:text-accent-primary transition-colors"
                title={social.name}
              >
                {social.icon}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
