import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHtmlPlugin } from 'vite-plugin-html';
import customSitemapPlugin from './scripts/custom-sitemap-plugin';

export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'MijnMotorParkeren.nl',
          description: 'Motor op de stoep parkeren? Vind motorparkeerregels per gemeente in Nederland',
        },
      },
    }),
    customSitemapPlugin(),
  ],
});
