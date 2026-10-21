import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
	css: ["~/assets/css/main.css"],
	vite: { plugins: [tailwindcss()] },
	ssr: true,
});
