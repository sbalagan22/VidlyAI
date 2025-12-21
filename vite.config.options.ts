import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// This config builds the Options page as a standard web app
export default defineConfig({
    plugins: [react()],
    base: './', // Ensure relative paths for assets in Chrome Extension
    build: {
        emptyOutDir: true, // Wipe dist first
        outDir: 'dist',
        rollupOptions: {
            input: {
                options: resolve(__dirname, 'options.html'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name]-[hash].js',
                assetFileNames: '[name].[ext]',
            },
        },
    },
});
