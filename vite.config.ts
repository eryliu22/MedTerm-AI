import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env.API_KEY in the browser
    // It replaces the string 'process.env.API_KEY' with the actual value during build
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
});