import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// base : chemin du site sur GitHub Pages (https://matt-dieter.github.io/cer-agent/)
// Chemin de base : /cer-agent/ sur GitHub Pages, / sur Cloudflare Pages (variable SITE_BASE à la compilation)
export default defineConfig({ plugins: [react()], base: process.env.SITE_BASE ?? "/cer-agent/" });
