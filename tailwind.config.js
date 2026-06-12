/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        navy: {
          900: "#0B1D3A",
          800: "#0F2647",
          700: "#14325A",
          600: "#1A3F6F",
        },
        carbon: {
          500: "#00C9A7",
          400: "#00E4BE",
          300: "#33D4B9",
          600: "#00A88C",
        },
        alert: {
          orange: "#FF8C42",
          red: "#FF4757",
        },
        surface: {
          dark: "#0F1923",
          card: "#141E2E",
          hover: "#1A2A3E",
          border: "#1E3048",
        },
      },
      fontFamily: {
        din: ["DIN Alternate", "Helvetica Neue", "Arial", "sans-serif"],
        noto: ["Noto Sans SC", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(0,201,167,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,201,167,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
    },
  },
  plugins: [],
};
