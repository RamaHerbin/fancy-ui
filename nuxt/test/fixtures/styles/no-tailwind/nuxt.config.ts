import FancyUi from "../../../../src/module";

// No Tailwind at all: only the module's fancy-ui-vue/styles.css reaches the
// page. Measures what the components look like on scoped CSS alone.
export default defineNuxtConfig({
	modules: [FancyUi],
	compatibilityDate: "2025-07-15",
	devtools: { enabled: false },
	telemetry: false,
});
