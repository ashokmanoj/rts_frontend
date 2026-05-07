import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function loadCerts() {
  const certDir = path.resolve(__dirname, 'certs');
  const cert = path.join(certDir, '192.168.1.128+2.pem');
  const key  = path.join(certDir, '192.168.1.128+2-key.pem');
  if (fs.existsSync(cert) && fs.existsSync(key)) {
    return { cert: fs.readFileSync(cert), key: fs.readFileSync(key) };
  }
  return undefined;
}

// ✅ Auto-copy web.config to dist after build
function copyWebConfig() {
  return {
    name: 'copy-web-config',
    closeBundle() {
      const src = path.resolve(__dirname, 'web.config');
      const dest = path.resolve(__dirname, 'dist', 'web.config');
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('✅ web.config copied to dist/');
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), copyWebConfig()],
  server: {
    host: true,
    https: loadCerts(),
    proxy: {
      '/api':     { target: 'http://localhost:5001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
})