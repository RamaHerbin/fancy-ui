import tailwindcss from "@tailwindcss/vite";

// Local playground for fancy-ui-nuxt. `pnpm run dev:prepare` stubs the module
// build once, then `pnpm run dev` serves this app against the module source.
export default defineNuxtConfig({
	modules: ["../src/module"],

	// Every option at its default. Uncomment to try another setup:
	// fancyUi: {
	// 	components: true, // or a subset: ["ShimmerButton", "BorderBeam"]
	// 	prefix: "Fancy", // "" registers the bare names (<ShimmerButton>)
	// 	css: true, // adds fancy-ui-vue/styles.css
	// 	composables: true, // auto-imports useSound, useSoundEnabled, …
	// },

	css: ["~/assets/css/main.css"],
	vite: { plugins: [tailwindcss()] },

	app: {
		head: {
			title: "fancy-ui-nuxt playground",
			htmlAttrs: { lang: "en", class: "dark" },
		},
	},

	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
});
