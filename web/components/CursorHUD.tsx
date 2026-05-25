"use client";

import { motion } from "framer-motion";
import { useCursorTracker } from "@/hooks/useCursorTracker";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { useEffect, useState } from "react";

interface CursorHUDProps {
  hoveredText: string | null;
  optimizedText: string | null;
  isLoading?: boolean;
}

export function CursorHUD({
  hoveredText,
  optimizedText,
  isLoading = false,
}: CursorHUDProps) {
  const { cursorPos, isVisible } = useCursorTracker();
  const isMobile = useMobileDetect();
  const [showHUD, setShowHUD] = useState(false);

  useEffect(() => {
    // Show HUD when there's hovered text and it's not mobile
    setShowHUD(isVisible && !!hoveredText && !isMobile);
  }, [hoveredText, isVisible, isMobile]);

  if (!showHUD || !hoveredText) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 15, stiffness: 300 }}
      style={{
        position: "fixed",
        left: `${cursorPos.x + 20}px`,
        top: `${cursorPos.y - 10}px`,
        pointerEvents: "none",
        zIndex: 9999,
      }}
      className="w-80"
    >
      <div className="glass glass-violet rounded-lg p-4 shadow-lg">
        {/* Original text */}
        <div className="mb-3">
          <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
            Original
          </p>
          <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
            {hoveredText}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-accent-violet to-transparent opacity-30 my-3" />

        {/* Optimized text */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium text-accent-violet uppercase tracking-wide">
              Optimized by Axiom
            </p>
            {isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3"
              >
                <div className="w-full h-full border-2 border-transparent border-t-accent-teal rounded-full" />
              </motion.div>
            )}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-accent-teal font-medium line-clamp-3"
          >
            {optimizedText || (isLoading ? "Optimizing..." : "Analyzing...")}
          </motion.p>
        </div>

        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-accent-violet to-accent-teal opacity-0 group-hover:opacity-10 rounded-lg -z-10 transition-opacity" />
      </div>
    </motion.div>
  );
}
