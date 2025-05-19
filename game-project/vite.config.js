import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',  // Para simular el DOM en pruebas
    setupFiles: './vitest.setup.js',  //  Opcional para jest-dom
    include: ['src/**/*.test.{js,jsx}'],  //  Ubicación de los tests
  },
});