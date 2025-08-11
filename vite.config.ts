import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts';
import path from "path"

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    // Dev server config for demo
    return {
      plugins: [react()],
      root: '.',
      server: {
        port: 3000,
        open: '/demo.html'
      }
    }
  } else {
    // Build config for library
    return {
      plugins: [
        dts({
          insertTypesEntry: true,
        }),
      ],
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'AudioVisualize',
          fileName: (format) => `react-audio-visualize.${format}.js`
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
            }
          }
        },
      },
    }
  }
})

