/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2C3E7A",
          light:   "#3D54A8",
          dark:    "#1A2550",
          pale:    "#EAECF8"
        },
        accent: {
          DEFAULT: "#C0882A",
          light:   "#FAF0DC",
          dark:    "#8C6010"
        },
        neutral: {
          50:  "#F8F9FC",
          100: "#F0F2F8",
          200: "#DDE1EF",
          300: "#BCC4DA",
          400: "#8A97B8",
          500: "#5C6A8A",
          600: "#445070",
          700: "#303A55",
          800: "#1E263A",
          900: "#0F1420"
        },
        status: {
          success:  "#16A34A",
          warning:  "#D97706",
          danger:   "#DC2626",
          info:     "#0891B2",
          overdue:  "#DC2626",
          returned: "#16A34A",
          issued:   "#0891B2",
          reserved: "#D97706"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
