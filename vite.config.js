import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Auto-injeta imports de React/ReactDOM em todo .jsx que usa sem import
function injectReactImport() {
  return {
    name: 'inject-react-import',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.jsx')) return;
      let inject = '';
      if (!code.includes('import React') && !code.includes("import React")) {
        inject += "import React from 'react';\n";
      }
      if (code.includes('ReactDOM') && !code.includes('import ReactDOM')) {
        inject += "import ReactDOM from 'react-dom/client';\n";
      }
      if (inject) return { code: inject + code, map: null };
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
