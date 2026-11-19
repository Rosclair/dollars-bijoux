import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SITE = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://dollarsbijoux.com")).replace(/\/$/, "");

export default defineConfig({
  plugins: [react(), { name: "site-url", transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", SITE) }],
  define: { "import.meta.env.VITE_SITE_URL": JSON.stringify(SITE) },
});
