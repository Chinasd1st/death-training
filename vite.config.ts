import { defineConfig } from 'vite';

// base: './' —— 相对路径，静态导出后可直接放到 GitHub Pages 的任意仓库子路径下
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
  },
  server: { port: 5174 },
});
