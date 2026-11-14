import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// base : chemin du site sur GitHub Pages (https://matt-dieter.github.io/cer-agent/)
export default defineConfig({ plugins: [react()], base: "/cer-agent/" });
