import tailwindcss from "@tailwindcss/vite";
import FancyUi from "../../../src/module";

// SSR → hydration → client navigation through the module's auto-imported
// shims, styled the documented way (Tailwind + fancy-ui-vue/tailwind.css).
export default defineNuxtConfig({
	modules: [FancyUi],
	css: ["~/assets/css/main.css"],
	vite: { plugins: [tailwindcss()] },
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
	// Production build, but Vue prints the details of any hydration mismatch
	// (node + expected/actual) instead of the bare one-line summary.
	debug: { hydration: true },
});
