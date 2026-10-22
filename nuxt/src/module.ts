// OWNER: Agent 4 (module/options).
import { defineNuxtModule } from "@nuxt/kit";
import { registerComponents } from "./components";
import { registerStyles } from "./styles";
import type { ModuleOptions } from "./types";

export type { ModuleOptions } from "./types";

export default defineNuxtModule<ModuleOptions>().with({
	meta: {
		name: "fancy-ui-nuxt",
		configKey: "fancyUi",
		compatibility: { nuxt: "^4.0.0" },
	},
	defaults: {
		components: true,
		prefix: "Fancy",
		css: true,
		composables: true,
	},
	setup(options, nuxt) {
		registerStyles(options, nuxt);
		registerComponents(options, nuxt);
	},
});
