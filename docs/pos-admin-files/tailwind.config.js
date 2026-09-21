/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#FFC107",
          dark: "#1A1A1A",
          light: "#F5F5F5",
          gray: "#757575",
          error: "#D32F2F",
          success: "#388E3C",
          warning: "#F57C00",
          info: "#1976D2",
        },
      },
      fontSize: {
        display: ["48px", { lineHeight: "56px", fontWeight: "700" }],
        h1: ["36px", { lineHeight: "44px", fontWeight: "700" }],
        h2: ["28px", { lineHeight: "36px", fontWeight: "600" }],
        h3: ["22px", { lineHeight: "30px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        label: ["14px", { lineHeight: "20px", fontWeight: "500" }],
        small: ["12px", { lineHeight: "16px", fontWeight: "400" }],
        tiny: ["11px", { lineHeight: "14px", fontWeight: "400" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
}
