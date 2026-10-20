import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // One dual-stack listener prevents different apps on IPv4/IPv6 localhost.
  server: { host: '::', port: 5173, strictPort: true },
});
