/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['"Noto Serif SC"', 'Songti SC', 'STSong', 'serif'],
      },
    },
  },
  plugins: [
    require('flowbite/plugin')
  ],
}

