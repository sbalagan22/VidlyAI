import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                content: resolve(__dirname, 'src/content/index.tsx'),
                options: resolve(__dirname, 'options.html'),
            },
            output: {
                entryFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
                chunkFileNames: '[name].js',
                inlineDynamicImports: false,
                manualChunks: undefined,
            }
        }
    }
})
