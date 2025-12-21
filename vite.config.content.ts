import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// This config builds the content script as a single file (IIFE)
export default defineConfig({
    plugins: [react()],
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    build: {
        emptyOutDir: false, // Don't wipe dist as options build will also write there
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'src/content/index.tsx'),
            name: 'ContentScript',
            fileName: () => 'content.js',
            formats: ['iife'], // Force IIFE so it works directly in Chrome
        },
        rollupOptions: {
            output: {
                extend: true,
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name === 'style.css') return 'content.css';
                    return assetInfo.name as string;
                },
            },
        },
    },
});
