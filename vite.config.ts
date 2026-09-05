import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages: 리포지토리 이름이 base가 된다. 커스텀 도메인/유저 페이지면 '/'로 변경.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE ?? '/agents/',
})
