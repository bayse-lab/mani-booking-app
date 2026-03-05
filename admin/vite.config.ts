import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mani-booking-app/admin/',
  server: {
    port: 3001,
    host: '127.0.0.1',
  },
});
