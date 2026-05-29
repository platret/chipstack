import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Project site lives at https://platret.github.io/chipstack/ — build with that base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/chipstack/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
}))
