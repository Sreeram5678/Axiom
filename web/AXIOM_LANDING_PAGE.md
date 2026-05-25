# Axiom Landing Page

A premium, interactive landing page for Axiom - The Unified Prompt Suite, featuring an innovative "Cursor Interceptor" HUD that demonstrates real-time text optimization.

## Features

### 🎨 Premium Design System
- Deep midnight-indigo background (#0f0e1a) with glassmorphic containers
- Violet (#a78bfa) and teal (#20c997) accent colors with glowing effects
- Smooth animations powered by Framer Motion
- Responsive design optimized for mobile and desktop

### 🔮 Core Interactive Features

#### Cursor Interceptor HUD
- Custom React hook (`useCursorTracker`) tracks mouse position globally
- Glassmorphic card follows cursor with spring animations
- Hovers over text elements to display optimized versions
- Shows "Original" vs "Optimized by Axiom" side-by-side
- Smooth fade-in/out transitions with text interception detection
- Hidden on mobile devices (respects touch interfaces)

#### Text Sandbox
- Interactive textarea for custom input text
- Real-time text optimization simulation
- Displays optimized output in glassmorphic card
- Copy button to clipboard functionality
- Mock "AI" processing with loading animation
- Responds to user input with semantic enhancement rules

### 📱 Responsive Sections

1. **Header** - Sticky navigation with brand logo, menu, and CTA buttons
2. **Hero** - Bold value proposition with animated backgrounds, CTAs, and text sandbox
3. **Features** - Bento grid showcasing 3 key benefits (0.0% CPU, Sovereign AI, Military-Grade Sync)
4. **FAQ** - Accordion-style frequently asked questions with smooth open/close animations
5. **Footer** - Complete footer with links, branding, and social icons

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS with custom design tokens
- **Animations**: Framer Motion
- **Typography**: Geist Sans & Geist Mono (Google Fonts)
- **Hooks**: Custom hooks for cursor tracking, mobile detection, text interception
- **Utilities**: Text optimization mappings, mock AI simulator

## Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main landing page (stateful wrapper)
│   └── globals.css         # Design tokens and glass effects
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── Hero.tsx            # Hero section with TextSandbox
│   ├── Features.tsx        # Feature cards (Bento grid)
│   ├── FAQ.tsx             # FAQ accordion
│   ├── CursorHUD.tsx       # Cursor-following HUD card
│   ├── TextSandbox.tsx     # Text input/optimization demo
│   └── Footer.tsx          # Footer section
├── hooks/
│   ├── useCursorTracker.ts # Mouse position tracking
│   ├── useMobileDetect.ts  # Mobile device detection
│   └── useTextInterception.ts (optional for future)
├── utils/
│   └── interceptorMap.ts   # Hardcoded optimizations & mock AI
├── lib/
│   └── cn.ts               # Classname utility
├── tailwind.config.ts      # Tailwind configuration
└── package.json
```

## Key Implementation Details

### Cursor Interceptor Algorithm
1. Global `mousemove` listener tracks cursor position
2. `mouseenter` on text elements captures content and bounding box
3. HUD positioned with offset from cursor (20px right, 10px down)
4. Optimized text retrieved from `interceptorMap` or generated via `aiSimulator`
5. Smooth spring animation via Framer Motion

### Text Optimization Logic
- **Hardcoded mappings**: Pre-configured for all landing page copy
- **Custom input**: Uses mock AI heuristics (removes filler words, adds action verbs, capitalizes)
- **Fallback**: Returns original text if optimization fails

### Design Tokens
- `--background`: Deep midnight-indigo theme
- `--accent-violet`: Primary accent (glowing borders)
- `--accent-teal`: Secondary accent (success states)
- Custom glass effects: `.glass`, `.glass-violet`, `.glass-teal`
- Glow utilities: `.glow-violet`, `.glow-teal`

## How to Run

```bash
cd web
npm install
npm run dev
# Visit http://localhost:3000
```

## Browser Compatibility

- Chrome/Edge (latest)
- Safari (latest)
- Firefox (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Notes

- Uses React.memo for HUD to prevent unnecessary re-renders
- Lazy loading via Framer Motion's `whileInView`
- Optimized animations with GPU acceleration
- No external API calls - all processing is client-side

## Future Enhancements

- Real AI integration (connect to optimization API)
- User accounts to save favorite optimizations
- Dark/light theme toggle
- Keyboard shortcuts for optimization
- Advanced text analytics dashboard
- Browser extension integration

## License

Axiom - All rights reserved
