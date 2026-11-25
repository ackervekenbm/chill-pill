import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Build facts for the About section. The image build passes COMMIT_SHA,
 * and BUILD_TIME; a local build falls back to dev values.
 */
export const buildDefine = {
  __BUILD_SHA__: JSON.stringify(process.env.COMMIT_SHA || 'dev'),
  __BUILD_TIME__: JSON.stringify(process.env.BUILD_TIME || ''),
}

export default defineConfig({
  plugins: [react()],
  define: buildDefine,
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5184,
    proxy: {
      '/api': 'http://127.0.0.1:3094',
    },
  },
})