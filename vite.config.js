import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O site é publicado em https://pedrofxt.github.io/imobiliaria/
export default defineConfig({
  base: '/imobiliaria/',
  plugins: [react()],
});
