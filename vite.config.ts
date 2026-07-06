import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { meta } from './src/meta';

// 生成 Tampermonkey 头部注释
function generateHeader(): string {
  const matchStr = meta.match.map(m => `// @match        ${m}`).join('\n');
  return `// ==UserScript==
// @name         ${meta.name}
// @namespace    ${meta.namespace}
// @version      ${meta.version}
// @description  ${meta.description}
${matchStr}
// @author       ${meta.author}
// @icon         ${meta.icon}
// @grant        ${meta.grant}
// @updateURL    ${meta.updateURL}
// @downloadURL  ${meta.downloadURL}
// @supportURL   ${meta.supportURL}
// ==/UserScript==

`;
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['iife'],
      name: 'EWT360Helper',
      fileName: () => 'main.user.js'
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        banner: generateHeader(),
        footer: `\n// Built at: ${new Date().toISOString()}\n// Source: ${meta.supportURL}`
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  esbuild: {
    // 确保 banner 被添加
    banner: generateHeader()
  }
});
