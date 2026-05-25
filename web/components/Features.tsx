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
  color: "violet" | "teal";
}

const features: Feature[] = [
  {
    id: "cpu",
    title: "0.0% Idle CPU",
    description:
      "Leverages Carbon macOS event hooks for zero overhead processing. Your system stays responsive.",
    icon: "⚡",
    optimized: "⚡ Zero Overhead Processing: Leverages native event hooks for imperceptible resource usage.",
    color: "violet",
  },
  {
    id: "sovereign",
    title: "On-Device Sovereign AI",
    description:
      "All processing stays on your machine. Your data, your control. No cloud uploads.",
    icon: "🔒",
    optimized: "🔒 Sovereign Intelligence: All processing stays on your machine. Your data, your control.",
    color: "teal",
  },
  {
    id: "sync",
    title: "Military-Grade Sync",
    description:
      "End-to-end encrypted synchronization. Your settings sync across devices securely.",
    icon: "🛡️",
    optimized: "🛡️ Enterprise-Grade Security: End-to-end encrypted synchronization across all your devices.",
    color: "violet",
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
      className="relative py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: false }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Why Choose Axiom?
          </h2>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            Purpose-built for power users who demand performance, privacy, and
            precision.
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
              whileHover={{ y: -8 }}
              className={`group cursor-text p-6 md:p-8 rounded-xl transition-all ${
                feature.color === "violet"
                  ? "glass glass-violet hover:glow-violet"
                  : "glass glass-teal hover:glow-teal"
              } ${hoveredId === feature.id ? "opacity-100" : "opacity-90"}`}
            >
              {/* Icon */}
              <motion.div
                animate={{
                  scale: hoveredId === feature.id ? 1.2 : 1,
                  rotate: hoveredId === feature.id ? 10 : 0,
                }}
                transition={{ duration: 0.3 }}
                className="text-5xl mb-4"
              >
                {feature.icon}
              </motion.div>

              {/* Title */}
              <h3
                className={`text-xl md:text-2xl font-bold mb-3 ${
                  feature.color === "violet"
                    ? "text-accent-violet"
                    : "text-accent-teal"
                }`}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-foreground-secondary leading-relaxed">
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
                className={`mt-4 pt-4 border-t ${
                  feature.color === "violet"
                    ? "border-accent-violet border-opacity-20"
                    : "border-accent-teal border-opacity-20"
                }`}
              >
                <a
                  href="#"
                  className={`text-sm font-medium ${
                    feature.color === "violet"
                      ? "text-accent-violet hover:text-accent-violet-dark"
                      : "text-accent-teal hover:text-accent-teal-light"
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
