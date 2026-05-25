"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";

interface FeaturesProps {
  onTextHover: (text: string | null, optimized: string | null) => void;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  optimized: string;
  color: "primary" | "secondary";
}

const features: Feature[] = [
  {
    id: "cpu",
    title: "Zero CPU Overhead",
    description:
      "Leverages native event hooks for imperceptible resource usage. Your system stays perfectly responsive.",
    icon: "⚡",
    optimized: "⚡ Zero Overhead Processing: Leverages native event hooks for imperceptible resource usage.",
    color: "primary",
  },
  {
    id: "sovereign",
    title: "On-Device Intelligence",
    description:
      "All processing happens locally. Your data never leaves your machine. Complete sovereignty.",
    icon: "🔒",
    optimized: "🔒 Sovereign Intelligence: All processing stays on your machine. Your data, your control.",
    color: "secondary",
  },
  {
    id: "sync",
    title: "End-to-End Encrypted",
    description:
      "Enterprise-grade synchronization across your devices. Secure, seamless, and transparent.",
    icon: "🛡️",
    optimized: "🛡️ Enterprise-Grade Security: End-to-end encrypted synchronization across all your devices.",
    color: "primary",
  },
];

export function Features({ onTextHover }: FeaturesProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement>>({});

  const handleMouseEnter = (feature: Feature) => {
    setHoveredId(feature.id);
    onTextHover(feature.title, feature.optimized);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    onTextHover(null, null);
  };

  return (
    <motion.section
      id="features"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: false, margin: "-100px" }}
      className="relative py-24 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false }}
          className="text-center mb-20 md:mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Why Axiom
          </h2>
          <p className="text-base text-foreground-secondary max-w-2xl mx-auto">
            Built for power users who demand performance, privacy, and precision.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              ref={(el) => {
                if (el) refs.current[feature.id] = el;
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: false }}
              onMouseEnter={() => handleMouseEnter(feature)}
              onMouseLeave={handleMouseLeave}
              whileHover={{ y: -4 }}
              className={`group cursor-text p-8 rounded-lg transition-all ${
                feature.color === "primary"
                  ? "glass glass-primary hover:glow-primary"
                  : "glass glass-secondary hover:glow-secondary"
              } ${hoveredId === feature.id ? "opacity-100" : "opacity-90"}`}
            >
              {/* Icon */}
              <motion.div
                animate={{
                  scale: hoveredId === feature.id ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="text-4xl mb-4"
              >
                {feature.icon}
              </motion.div>

              {/* Title */}
              <h3
                className={`text-lg font-semibold mb-3 ${
                  feature.color === "primary"
                    ? "text-accent-primary"
                    : "text-accent-secondary"
                }`}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {feature.description}
              </p>

              {/* Learn More Link */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: hoveredId === feature.id ? 1 : 0,
                  x: hoveredId === feature.id ? 0 : -10,
                }}
                transition={{ duration: 0.3 }}
                className={`mt-4 pt-4 border-t border-border-light`}
              >
                <a
                  href="#"
                  className={`text-xs font-medium ${
                    feature.color === "primary"
                      ? "text-accent-primary hover:text-accent-primary-light"
                      : "text-accent-secondary hover:text-accent-secondary-light"
                  } transition-colors`}
                >
                  Learn more →
                </a>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
