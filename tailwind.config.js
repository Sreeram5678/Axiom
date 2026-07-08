/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup/popup.html",
    "./popup/popup.js"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "inverse-on-surface": "#f3f0ed",
        "surface-tint": "#536254",
        "on-error": "#ffffff",
        "on-tertiary-fixed-variant": "#494640",
        "secondary": "#964735",
        "primary-fixed-dim": "#bacbb9",
        "inverse-primary": "#bacbb9",
        "secondary-container": "#fd9882",
        "surface-container-lowest": "#ffffff",
        "tertiary-fixed": "#e8e2d9",
        "error-container": "#ffdad6",
        "tertiary-fixed-dim": "#cbc6bd",
        "on-primary-fixed-variant": "#3b4a3d",
        "secondary-fixed": "#ffdad3",
        "on-tertiary-container": "#efe9e0",
        "error": "#ba1a1a",
        "surface-container": "#f0edea",
        "on-tertiary": "#ffffff",
        "tertiary": "#54514a",
        "surface": "#fcf9f5",
        "surface-bright": "#fcf9f5",
        "secondary-fixed-dim": "#ffb4a4",
        "surface-container-low": "#f6f3f0",
        "outline-variant": "#c3c8c1",
        "primary-fixed": "#d6e7d5",
        "primary-container": "#5d6d5e",
        "surface-container-high": "#eae8e4",
        "inverse-surface": "#31302e",
        "on-secondary": "#ffffff",
        "on-secondary-fixed-variant": "#783020",
        "outline": "#747872",
        "surface-variant": "#e5e2df",
        "tertiary-container": "#6c6962",
        "surface-container-highest": "#e5e2df",
        "on-primary-fixed": "#111f13",
        "on-tertiary-fixed": "#1d1b16",
        "on-error-container": "#93000a",
        "on-secondary-container": "#772f1f",
        "on-primary-container": "#ddeedb",
        "on-surface": "#1b1c1a",
        "on-surface-variant": "#434843",
        "on-primary": "#ffffff",
        "surface-dim": "#dcdad6",
        "on-secondary-fixed": "#3d0600",
        "on-background": "#1b1c1a",
        "primary": "#455547",
        "background": "#fcf9f5"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "touch-target": "40px",
        "container-padding": "16px",
        "section-gap": "20px",
        "stack-gap": "8px",
        "unit": "4px"
      },
      fontFamily: {
        "label-md": ["JetBrains Mono", "monospace"],
        "label-sm": ["JetBrains Mono", "monospace"],
        "headline-lg": ["Geist", "sans-serif"],
        "body-sm": ["Geist", "sans-serif"],
        "body-lg": ["Geist", "sans-serif"],
        "headline-md": ["Geist", "sans-serif"]
      },
      fontSize: {
        "label-md": ["11px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "500" }],
        "label-sm": ["10px", { "lineHeight": "14px", "fontWeight": "500" }],
        "headline-lg": ["18px", { "lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-sm": ["12px", { "lineHeight": "18px", "fontWeight": "400" }],
        "body-lg": ["13px", { "lineHeight": "18px", "fontWeight": "400" }],
        "headline-md": ["15px", { "lineHeight": "22px", "letterSpacing": "-0.01em", "fontWeight": "600" }]
      }
    }
  },
  plugins: []
}
