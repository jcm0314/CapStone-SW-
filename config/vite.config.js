import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { configDefaults } from 'vitest/config';

import { validateProductionBuildEnv } from '../scripts/checkBuildEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command, mode }) => {
  // production 빌드는 API 게이트웨이 주소 없이 진행하지 않음 (#24, docs/DEPLOY.md)
  if (command === 'build' && mode === 'production') {
    validateProductionBuildEnv(loadEnv(mode, process.cwd(), ''));
  }

  return {
    plugins: [react()],
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.js')
    },
    server: {
      port: 3000,
      open: true
    },
    test: {
      globals: true,
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, '.claude/**']
    }
  };
});
