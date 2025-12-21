import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        emptyOutDir: false, // Don't empty as other builds use this dir
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'src/background/index.ts'),
            name: 'BackgroundScript',
            fileName: () => 'background.js',
            formats: ['iife'],
        },
        rollupOptions: {
            output: {
                extend: true,
            },
        },
    },
});
