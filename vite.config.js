import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Auto-injeta imports globais em todo .jsx que usa sem import
function injectReactImport() {
  const globals = [
    { name: 'React', pkg: 'react' },
    { name: 'ReactDOM', pkg: 'react-dom/client' },
    { name: 'THREE', pkg: 'three' },
  ];
  return {
    name: 'inject-globals',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.jsx')) return;
      let inject = '';
      for (const g of globals) {
        if (code.includes(g.name) && !code.includes(`import ${g.name}`) && !code.includes(`import * as ${g.name}`)) {
          const star = g.name === 'THREE' ? `* as ${g.name}` : g.name;
          inject += `import ${star} from '${g.pkg}';\n`;
        }
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
