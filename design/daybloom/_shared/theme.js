// Daybloom design tokens for the HTML prototype (Tailwind Play CDN).
// Mirrors design/tokens.json, with the accessibility fixes from docs/DESIGN_REVIEW.md applied.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        "background": "#fff8f5",
        "on-background": "#1e1b18",
        "surface": "#fff8f5",
        "surface-dim": "#e1d8d4",
        "surface-bright": "#fff8f5",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fbf2ed",
        "surface-container": "#f5ece7",
        "surface-container-high": "#efe6e2",
        "surface-container-highest": "#e9e1dc",
        "surface-variant": "#e9e1dc",
        "on-surface": "#1e1b18",
        "on-surface-variant": "#424843",
        "inverse-surface": "#34302c",
        "inverse-on-surface": "#f8efea",
        "outline": "#676d67",
        "outline-variant": "#c1c8c1",

        "primary": "#43654f",
        "on-primary": "#ffffff",
        "primary-container": "#5b7e67",
        "on-primary-container": "#ffffff",
        "primary-fixed": "#c5ecd0",
        "primary-fixed-dim": "#aacfb5",
        "on-primary-fixed": "#002111",
        "on-primary-fixed-variant": "#2c4e39",

        "secondary": "#8f4b3b",
        "on-secondary": "#ffffff",
        "secondary-container": "#fda590",
        "on-secondary-container": "#783929",
        "secondary-fixed": "#ffdad2",
        "secondary-fixed-dim": "#ffb4a3",
        "on-secondary-fixed": "#3a0a02",
        "on-secondary-fixed-variant": "#723425",

        "tertiary": "#815404",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#9e6c20",
        "tertiary-fixed": "#ffddb5",
        "tertiary-fixed-dim": "#f9bb68",
        "on-tertiary-fixed": "#2a1800",
        "on-tertiary-fixed-variant": "#643f00",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        // Event categories (tokens.json categoryColor)
        "social": "#9b8ea9",
        "social-container": "#ece6f3",
        "on-social-container": "#584a6b",

        "scrim": "#2d2926"
      },
      fontFamily: {
        serif: ["Literata", "serif"],
        sans: ["Plus Jakarta Sans", "sans-serif"]
      },
      fontSize: {
        "display-lg-mobile": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "500" }],
        "headline-sm": ["18px", { lineHeight: "26px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "18px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "600" }],
        // Fix A4: was 10px
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "700" }],
        // Month grid cells only (fix A4: was 8-9px)
        "label-xs": ["11px", { lineHeight: "14px", letterSpacing: "0.01em", fontWeight: "600" }]
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px"
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "gutter-sm": "0.75rem",
        "gutter": "1rem",
        "margin-sm": "1rem",
        "margin": "1.25rem",
        "margin-lg": "2rem"
      },
      boxShadow: {
        card: "0 4px 16px -2px rgba(45,41,38,0.06), 0 2px 6px -1px rgba(45,41,38,0.03)",
        float: "0 8px 24px -4px rgba(45,41,38,0.16), 0 2px 8px -2px rgba(45,41,38,0.06)"
      },
      minHeight: { touch: "48px", dense: "32px" },
      minWidth: { touch: "48px", dense: "32px" }
    }
  }
};
