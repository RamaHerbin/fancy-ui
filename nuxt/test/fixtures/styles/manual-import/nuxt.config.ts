import tailwindcss from "@tailwindcss/vite";
import FancyUi from "../../../../src/module";

// The pre-module setup: main.css already imports fancy-ui-vue/styles.css
// itself. The module (css: true) must notice and not add it a second time.
export default defineNuxtConfig({
	modules: [FancyUi],
	css: ["~/assets/css/main.css"],
	vite: { plugins: [tailwindcss()] },
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
});
