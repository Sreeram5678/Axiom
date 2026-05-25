"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { CursorHUD } from "@/components/CursorHUD";

export default function Home() {
  const [hoveredText, setHoveredText] = useState<string | null>(null);
  const [optimizedText, setOptimizedText] = useState<string | null>(null);

  const handleTextHover = (original: string | null, optimized: string | null) => {
    setHoveredText(original);
    setOptimizedText(optimized);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Cursor HUD - Always rendered, hidden on mobile */}
      <CursorHUD
        hoveredText={hoveredText}
        optimizedText={optimizedText}
        isLoading={false}
      />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero onTextHover={handleTextHover} />

        {/* Features Section */}
        <Features onTextHover={handleTextHover} />

        {/* FAQ Section */}
        <FAQ />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
