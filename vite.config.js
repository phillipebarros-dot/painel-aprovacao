import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Auto-injeta `import React from 'react'` em todo .jsx que não tem
function injectReactImport() {
  return {
    name: 'inject-react-import',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('.jsx') && !code.includes('import React')) {
        return { code: `import React from 'react';\n${code}`, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    injectReactImport(),
    react({
      jsxRuntime: 'classic',
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        },
      },
    },
  },
});
