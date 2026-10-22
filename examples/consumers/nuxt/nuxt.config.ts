import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
	css: ["~/assets/css/main.css"],
	vite: {
		plugins: [tailwindcss()],
		// Vue's production runtime always logs "Hydration completed but contains
		// mismatches." as a console error. This flag only adds the per-node detail
		// (what the server rendered versus the client) to a failing smoke run.
		define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true" },
	},
	ssr: true,
});
