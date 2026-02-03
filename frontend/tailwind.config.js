/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00A3FF",
        "primary-hover": "#0089D9",
        "primary-light": "#E6F6FF",
        brand: "#00A3FF",
        surface: "#ffffff",
        border: "#f1f3f5",
        "text-main": "#1a1c1e",
        "text-muted": "#868e96",
        "red-live": "#ff4d4f",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Pretendard", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        sky: "0 10px 30px -10px rgba(0, 163, 255, 0.12)",
        "sky-hover": "0 20px 40px -12px rgba(0, 163, 255, 0.15)",
      },
    },
  },
  plugins: [],
};
