export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "yelp-red": "#d32323",
        "yelp-red-hover": "#af1f1f",
        "surface": {
          muted: "#f7f7f7",
          subtle: "#fafafa",
        },
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "1.15", fontWeight: "700" }],
        "display-sm": ["1.875rem", { lineHeight: "1.2", fontWeight: "700" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        "card-hover":
          "0 2px 4px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)",
        nav: "0 1px 0 rgba(0,0,0,0.06)",
      },
      maxWidth: {
        content: "68rem",
      },
    },
  },
  plugins: [],
};
