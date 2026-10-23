import tailwindcss from "@tailwindcss/vite";
import FancyUi from "../../../../src/module";

// The documented setup: Tailwind through its Vite plugin, the app's main.css
// importing tailwindcss + fancy-ui-vue/tailwind.css, and the module adding
// fancy-ui-vue/styles.css (css defaults to true).
export default defineNuxtConfig({
	modules: [FancyUi],
	css: ["~/assets/css/main.css"],
	vite: { plugins: [tailwindcss()] },
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
});
