import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
	css: ["~/assets/css/main.css"],
	vite: {
		plugins: [tailwindcss()],
		// Keep Vue's hydration diagnostics in the production build, so the smoke
		// can see a mismatch instead of Vue silently patching over it.
		define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true" },
	},
	ssr: true,
});
