import tailwindcss from "@tailwindcss/vite";

// The README setup of fancy-ui-nuxt, nothing more: the module registers the
// components and adds fancy-ui-vue/styles.css, the app keeps the two Tailwind
// lines in its own CSS.
export default defineNuxtConfig({
	modules: ["fancy-ui-nuxt"],
	css: ["~/assets/css/main.css"],
	vite: {
		plugins: [tailwindcss()],
		// Vue's production runtime always logs "Hydration completed but contains
		// mismatches." as a console error. This flag only adds the per-node detail
		// (what the server rendered versus the client) to a failing smoke run.
		define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "true" },
	},
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
	ssr: true,
});
