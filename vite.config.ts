import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    base: './',
    plugins: [
        tailwindcss(),
        react()
    ],
    build: {
        outDir: "dist",
        rollupOptions: {
        input: {
            'options/index': resolve(__dirname, 'src/options/index.html'),
        },
        output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
        }
        }
    }
})