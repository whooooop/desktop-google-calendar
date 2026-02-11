import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/main.ts'),
        },
      },
      outDir: 'out/main',
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          widget: resolve(__dirname, 'src/preload/widget.ts'),
          settings: resolve(__dirname, 'src/preload/settings.ts'),
        },
      },
      outDir: 'out/preload',
    },
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: { '@assets': resolve(__dirname, 'src/assets') },
    },
    build: {
      rollupOptions: {
        input: {
          widget: resolve(__dirname, 'src/renderer/widget/widget.html'),
          settings: resolve(__dirname, 'src/renderer/settings/settings.html'),
        },
      },
      outDir: 'out/renderer',
    },
    plugins: [vue()],
  },
})
