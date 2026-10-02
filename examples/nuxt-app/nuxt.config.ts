// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
	css: ["~/assets/css/main.css"],
	// Tailwind goes in as a Vite plugin, not a PostCSS plugin — same as the
	// Svelte app at the repo root, and for the same reason. Nuxt builds with
	// Vite, whose CSS pipeline runs postcss-import BEFORE the PostCSS plugins;
	// postcss-import then tries to resolve `@import "tailwindcss"` itself and
	// dies with ENOENT on <app>/tailwindcss. The Vite plugin claims the
	// stylesheet first, so the bare import resolves. (The sibling Next example
	// uses @tailwindcss/postcss because webpack has no such pre-pass.)
	vite: {
		plugins: [tailwindcss()],
	},
	nitro: {
		prerender: {
			crawlLinks: true,
			routes: ["/"],
			// Load-bearing: this is the SSR/hydration CI gate. Without failOnError, a
			// broken prerender (SSR crash, hydration mismatch surfaced at generate time)
			// exits 0 and the gate silently passes.
			failOnError: true,
		},
	},
	ssr: true,
});
