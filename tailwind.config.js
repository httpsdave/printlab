/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        printblue: {
          50: "#e6f0ff",
          100: "#ccddff",
          200: "#99bbff",
          300: "#6699ff",
          400: "#3377ff",
          500: "#0055ff",
          600: "#0044cc",
          700: "#003399",
          800: "#002266",
          900: "#001133"
        },
        accent: {
          400: "#f0b64c",
          500: "#e8a846",
          600: "#d39232",
        },
        ink: "#0f172a"
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0, 85, 255, 0.08)",
        floating: "0 20px 40px -10px rgba(0, 85, 255, 0.15), 0 10px 20px -5px rgba(0, 85, 255, 0.1)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
      },
      animation: {
        "scan-line": "scanLine 2.4s ease-in-out infinite",
        "soft-pulse": "softPulse 1.9s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
      },
      keyframes: {
        scanLine: {
          "0%, 100%": { transform: "translateY(8%)", opacity: "0.2" },
          "50%": { transform: "translateY(92%)", opacity: "0.75" }
        },
        softPulse: {
          "0%, 100%": { opacity: "0.55", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        }
      }
    },
  },
  plugins: [],
};
