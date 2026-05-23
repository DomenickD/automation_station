/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: "var(--brand-color)",
      },
      keyframes: {
        slideUp: {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(10px)" },
          "100%": { opacity: "1", transform: "translateX(-50%) translateY(0)" },
        },
      },
      animation: {
        "slide-up": "slideUp 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
