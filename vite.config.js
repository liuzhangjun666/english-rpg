import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [
        vue(),
        laravel({
            input: ['resources/js/main.js', 'resources/js/vue/main.ts'],
            refresh: true,
        }),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    build: {
        chunkSizeWarningLimit: 800,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/three')) {
                        return 'three-vendor';
                    }
                    if (id.includes('node_modules/element-plus')) {
                        return 'element-vendor';
                    }
                    if (
                        id.includes('node_modules/vue/') ||
                        id.includes('node_modules/pinia/') ||
                        id.includes('node_modules/vue-router/')
                    ) {
                        return 'vue-vendor';
                    }
                }
            }
        }
    },
});
