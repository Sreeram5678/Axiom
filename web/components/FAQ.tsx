"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does Axiom work?",
    answer:
      "Axiom analyzes your text input and applies intelligent optimization rules to enhance clarity, conciseness, and impact. All processing happens on your device—no data is sent to external servers.",
  },
  {
    question: "Is my data private?",
    answer:
      "Absolutely. Axiom uses on-device processing exclusively. Your prompts, notes, and all text never leave your computer. We don't have access to any of your data.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "Axiom is available as a native macOS application and as a Chrome extension for web-based workflows. Additional platform support is coming soon.",
  },
  {
    question: "Does Axiom require internet?",
    answer:
      "No. Axiom works completely offline. All optimization happens locally on your device, making it perfect for secure environments.",
  },
  {
    question: "Can I use Axiom in my favorite tools?",
    answer:
      "Yes! The Chrome extension integrates seamlessly with most web applications. The macOS app provides system-wide optimization across any text field.",
  },
  {
    question: "What about keyboard shortcuts?",
    answer:
      "Axiom supports customizable keyboard shortcuts for quick access. You can optimize text with a single keystroke.",
  },
];

export function FAQ() {
  const [openId, setOpenId] = useState<number | null>(0);

  return (
    <motion.section
      id="faq"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: false, margin: "-100px" }}
      className="relative py-24 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-2xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            FAQ
          </h2>
          <p className="text-base text-foreground-secondary">
            Everything you need to know about Axiom
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              viewport={{ once: false }}
              className="group"
            >
              <button
                onClick={() => setOpenId(openId === idx ? null : idx)}
                className="w-full glass glass-primary rounded-lg p-5 md:p-6 text-left hover:glow-primary transition-all flex items-center justify-between group"
              >
                <span className="text-base md:text-lg font-medium text-foreground pr-4">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openId === idx ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                >
                  <span className="text-lg text-accent-primary">+</span>
                </motion.div>
              </button>

              {/* Answer */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{
                  opacity: openId === idx ? 1 : 0,
                  height: openId === idx ? "auto" : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="glass glass-secondary rounded-b-lg rounded-t-none px-5 md:px-6 py-4 md:py-5 border-t border-border-light">
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: false }}
          className="mt-16 text-center"
        >
          <p className="text-base text-foreground-secondary mb-6">
            Still have questions?
          </p>
          <motion.a
            href="#"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block px-8 py-3 border border-border-light text-foreground rounded-md font-medium text-sm hover:bg-background-hover transition-colors"
          >
            Contact Us
          </motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
}
