import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const DEMO = process.env.VITE_DEMO !== "0";
const SITE = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://dollarsbijoux.com")).replace(/\/$/, "");

export default defineConfig({
  plugins: [react(), { name: "site-url", transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", SITE).replace("%DEMO_ROBOTS%", DEMO ? '<meta name="robots" content="noindex, nofollow" />' : "") }],
  define: { "import.meta.env.VITE_SITE_URL": JSON.stringify(SITE), "import.meta.env.VITE_IS_DEMO": JSON.stringify(DEMO) },
});
