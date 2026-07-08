import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file, double-click-openable output (file://). WebGL2 runtime is
// mandatory: WebGPU is blocked from file:// by Chrome secure-context rules.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { target: 'esnext', chunkSizeWarningLimit: 2000 },
});
