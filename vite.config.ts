import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    base: './',
    publicDir: 'public',
    plugins: [
        tailwindcss(),
        react()
    ],
    build: {
        outDir: "dist",
        rollupOptions: {
        input: {
            'options/index': resolve(__dirname, 'src/options/options.html'),
            'scripts/content': resolve(__dirname, 'src/scripts/content.ts'),
            'popup/index': resolve(__dirname, 'src/popup/popup.html')
        },
        output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
        }
        }
    }
})