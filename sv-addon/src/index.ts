import { defineAddon, defineAddonOptions } from "sv";
import { defineDemoPage } from "@sveltejs/sv-utils";
import { FANCY_CSS, addFancyImport } from "./css.js";
import { fancyDependencyToAdd, isBelowSvelte520, majorOf } from "./deps.js";
import { VITE_DEMO_PATH, demoSource } from "./demo.js";
import { planCss } from "./plan.js";

/** fancy-ui-svelte version this add-on was built with (injected from ../package.json). */
const VERSION: string = __FANCY_VERSION__;
const DOCS = "https://fancy-ui.rama.app/docs/getting-started/installation";
const ID = "fancy-ui";

const options = defineAddonOptions()
	.add("demo", {
		question: "Add a demo page?",
		type: "boolean",
		default: true,
	})
	.build();

// What run() did, for nextSteps() (same process, same add-on instance, reset on each run).
const state = { cssFile: null as string | null, cssMissing: false, oldSvelte: false };

export default defineAddon({
	id: ID,
	shortDescription: "animated components (Tailwind v4)",
	homepage: DOCS,
	options,

	setup: ({ cwd, dependencyVersion, file, directory, unsupported, dependsOn }) => {
		const svelte = majorOf(dependencyVersion("svelte"));
		if (svelte !== null && svelte < 5) unsupported("fancy-ui-svelte needs Svelte 5");
		const tailwind = majorOf(dependencyVersion("tailwindcss"));
		if (tailwind !== null && tailwind < 4) {
			unsupported(`fancy-ui-svelte needs Tailwind CSS v4 (found v${tailwind})`);
			return;
		}
		// No Tailwind, or Tailwind declared but imported by no CSS file: let the official
		// tailwindcss add-on set it up first (vite plugin, stylesheet, import in the root layout).
		const plan = planCss(cwd, file.stylesheet, directory.src);
		if (tailwind === null || (!plan.target && !plan.alreadyWired)) dependsOn("tailwindcss");
	},

	run: ({ sv, cwd, options, file, directory, isKit, language, dependencyVersion }) => {
		state.cssFile = null;
		state.cssMissing = false;
		state.oldSvelte = isBelowSvelte520(dependencyVersion("svelte"));

		const range = fancyDependencyToAdd(dependencyVersion("fancy-ui-svelte"), VERSION);
		if (range) sv.dependency("fancy-ui-svelte", range);

		// Read after the tailwindcss add-on (if it ran) wrote the stylesheet: add-ons run one
		// after the other and every sv.file() edit is on disk when the next one starts.
		const plan = planCss(cwd, file.stylesheet, directory.src);
		if (plan.target) {
			sv.file(plan.target, addFancyImport);
			state.cssFile = plan.target;
		} else if (plan.alreadyWired) {
			state.cssFile = plan.alreadyWired;
		} else {
			state.cssMissing = true;
		}

		if (!options.demo) return;
		const writeOnce = (content: string) => (content ? false : demoSource(language));
		if (isKit) {
			const demo = defineDemoPage(ID, language, directory.kitRoutes);
			sv.file(`${demo.addonPath}/+page.svelte`, writeOnce);
			sv.file(...demo.links);
			sv.file(...demo.layout);
		} else {
			sv.file(`${directory.lib}/${VITE_DEMO_PATH}`, writeOnce);
		}
	},

	nextSteps: ({ options, isKit, directory }) => {
		const steps: string[] = [];
		if (state.cssMissing)
			steps.push(
				`No CSS file imports Tailwind: add \`@import "${FANCY_CSS}";\` right after \`@import "tailwindcss";\` in your CSS entry`
			);
		if (state.oldSvelte) steps.push("fancy-ui-svelte expects Svelte 5.20 or later: update svelte");
		if (options.demo) {
			if (isKit) steps.push("Open /demo/fancy-ui in the dev server to see the demo");
			else
				steps.push(
					`Render the demo: import FancyDemo from "./lib/${VITE_DEMO_PATH}" in ${directory.src}/App.svelte`
				);
		}
		steps.push(`Docs, theming and dark mode: ${DOCS}`);
		return steps;
	},
});
