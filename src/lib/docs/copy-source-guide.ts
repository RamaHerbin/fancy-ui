/**
 * The "Copy source" guide (/docs/getting-started/copy-source): how to copy a
 * component's source into a project instead of installing the npm package.
 *
 * Technical reference content, kept in English like the recipe bodies (see
 * CONTRIBUTING.md, "What stays English"); the page chrome comes from the
 * catalogs. Inline `code` is written with backticks and rendered by the page.
 * Commands and import paths come from `$lib/copy-source`, the one place that
 * spells them. The facts about the CLIs' behaviour were checked with
 * `scripts/check-registry-cli.mjs` (pinned versions there).
 */

import {
	COPY_CLI,
	COPY_CLI_SVELTE,
	COPY_CLI_VUE,
	REGISTRY_BASE,
	REGISTRY_BASE_SVELTE,
	REGISTRY_BASE_VUE,
	copyCommandFor,
	copyImportFor,
	type CopyFramework,
} from "$lib/copy-source.js";
import { license } from "../../../package.json";

export type GuideBlock =
	| { kind: "p"; text: string }
	| { kind: "list"; items: string[] }
	| { kind: "code"; lang: string; code: string };

export interface GuideSection {
	id: string;
	title: string;
	blocks: GuideBlock[];
	/** Per-framework blocks, rendered under one sub-heading each. */
	perFramework?: Record<CopyFramework, GuideBlock[]>;
}

export const FRAMEWORK_LABELS: Record<CopyFramework, string> = {
	svelte: "Svelte",
	react: "React",
	vue: "Vue",
};

/** The order the page lists the frameworks in. */
export const FRAMEWORK_ORDER: readonly CopyFramework[] = ["svelte", "react", "vue"];

const init = (add: string) => add.replace(/ add$/, " init");
const p = (text: string): GuideBlock => ({ kind: "p", text });
const list = (...items: string[]): GuideBlock => ({ kind: "list", items });
const code = (lang: string, text: string): GuideBlock => ({ kind: "code", lang, code: text });

const EXAMPLE = "rainbow-button";
const COLOR_SCHEME = ":root {\n\tcolor-scheme: light dark;\n}\n.dark {\n\tcolor-scheme: dark;\n}";
const DARK_VARIANT = `@custom-variant dark {
	&:where(.dark, .dark *) {
		@slot;
	}
	@media (prefers-color-scheme: dark) {
		&:where(:not(.light, .light *)) {
			@slot;
		}
	}
}`;

export const COPY_SOURCE_LEAD =
	"Every component is also published as source you copy into your project with your framework's registry CLI. The files become yours: you edit them freely, and nothing depends on the npm package at runtime.";

export const COPY_SOURCE_DESCRIPTION =
	"Copy FancyUI component source into a Svelte, React or Vue project with the registry CLI: prerequisites, commands, updates, dark mode and what stays npm-only.";

export const COPY_SOURCE_SECTIONS: readonly GuideSection[] = [
	{
		id: "package-or-copy",
		title: "Package or copied source",
		blocks: [
			list(
				"**npm package** (`fancy-ui-svelte`, `fancy-ui-react`, `fancy-ui-vue`): one dependency, one stylesheet import. Updates arrive by bumping the version. The package also ships the skin engine and the retro kit.",
				"**Copied source**: the files of the components you pick land in your repository. You own them: edit, delete, refactor. Updates are a re-run of the add command and a diff you review."
			),
			p(
				"Both give the same components with the same props. Pick per project; see the mixing rule below before combining them."
			),
		],
	},
	{
		id: "prerequisites",
		title: "Prerequisites",
		blocks: [
			list(
				"Tailwind CSS v4 and TypeScript.",
				"A project initialised with the registry CLI of your framework. `init` writes `components.json` (with the `ui` alias the files land under), a `cn` helper and the semantic color tokens the components read."
			),
		],
		perFramework: {
			svelte: [
				code("bash", init(COPY_CLI_SVELTE)),
				p(
					"SvelteKit with the `$lib` alias. The components import `cn` from your own `$lib/utils`; nothing else from your project."
				),
			],
			react: [
				code("bash", init(COPY_CLI)),
				p(
					"Vite or Next.js with the `@/` path alias. Relative imports between the copied files have no extension, so both bundlers resolve them."
				),
			],
			vue: [
				code("bash", init(COPY_CLI_VUE)),
				p(
					"Vite or Nuxt with the `@/` path alias. Keep the default `ui` alias, `@/components/ui`: the Vue CLI places the files by their path, and with a custom alias such as `@/shared/ui` it nests them under `<alias>/ui/fancy/`. In Nuxt, keep the copied tree out of component auto-import:"
				),
				code("ts", 'components: { dirs: [{ path: "~/components", ignore: ["ui/fancy/**"] }] }'),
			],
		},
	},
	{
		id: "add",
		title: "Add a component",
		blocks: [
			p(
				"Each component page has the exact command in its install block, under Copy source. The pattern is the item's URL in the registry of your framework:"
			),
		],
		perFramework: {
			svelte: [
				code("bash", copyCommandFor(EXAMPLE, "svelte")),
				p("Files land in `fancy/<slug>/` under your `ui` alias. Import from there:"),
				code("ts", copyImportFor(EXAMPLE, ["RainbowButton"], "svelte")),
			],
			react: [
				code("bash", copyCommandFor(EXAMPLE, "react")),
				p("Files land in `fancy/components/<slug>/` under your `ui` alias. Import from there:"),
				code("ts", copyImportFor(EXAMPLE, ["RainbowButton"], "react")),
			],
			vue: [
				code("bash", copyCommandFor(EXAMPLE, "vue")),
				p(
					"Files land in `fancy/components/<slug>/` under the default `components/ui` directory (a custom `ui` alias nests them under `<alias>/ui/fancy/`). Import from there:"
				),
				code("ts", copyImportFor(EXAMPLE, ["RainbowButton"], "vue")),
			],
		},
	},
	{
		id: "dependencies",
		title: "Shared files and npm dependencies",
		blocks: [
			list(
				"Shared modules (`utils`, `internals`, `sound`, …) are separate items. The CLI installs the ones a component needs, once, next to the components; a second component that needs them reuses the same files.",
				"npm packages a component imports (for example `canvas-confetti` or `three`) are installed at the range the package itself is built against, with their `@types` packages when TypeScript needs them.",
				"Copied files never import `fancy-ui-svelte`, `fancy-ui-react`, `fancy-ui-vue` or `fancy-ui-cameleon`; the registry build fails if one would."
			),
		],
	},
	{
		id: "update",
		title: "Updating a copied component",
		blocks: [
			p(
				"Every item carries `meta.version`, the version of the npm package its files were cut from, and `meta.license`. Open the item URL to see what the registry serves now. To update:"
			),
			list(
				"Commit your work, so the update is one reviewable diff.",
				"Re-run the add command with `--overwrite` (`-o` for Vue). It rewrites the component and its shared files with the registry version.",
				"Review the diff and keep the edits you still want."
			),
			p(
				"Without `--overwrite`, the CLIs ask before replacing a file that already exists, and answering no keeps your copy. The Svelte CLI also asks when a component's shared items are already installed; run without a terminal (in a script or CI), it then installs nothing, so pass `--overwrite` there. The CLIs may reformat what they write: the React CLI can drop a file's leading comment, the Vue CLI re-indents."
			),
		],
	},
	{
		id: "mixing",
		title: "Mixing the package and copies",
		blocks: [
			p(
				"One app can use the package for some components and copies for others, but never the same component from both. Each copy has its own internals (portal root, focus and dismissal helpers, ids, the sound engine and its settings), so a copied component does not share state with the package's, and two copies of a provider do not see each other. Pick one source per component, and import copied files only from your own tree."
			),
		],
	},
	{
		id: "dark-mode",
		title: "Dark mode and tokens",
		blocks: [
			p(
				"The package's stylesheet declares the semantic tokens and a `dark` variant that follows a `.dark` class or, without one, the system preference. A copied install uses the tokens and the class-based `dark` variant your CLI `init` wrote instead, so dark mode follows `.dark` only. The components' `light-dark()` colors follow `color-scheme`; declare it if your CSS does not:"
			),
			code("css", COLOR_SCHEME),
			p(
				'For `dark:` utilities that follow the system preference when no `.dark` or `.light` class is set, as the package does, declare its variant after `@import "tailwindcss";` (your token block still switches on `.dark`):'
			),
			code("css", DARK_VARIANT),
		],
	},
];

/** The three registry indexes, for the last section. */
export const REGISTRY_INDEXES: Record<CopyFramework, string> = {
	svelte: `${REGISTRY_BASE_SVELTE}/registry.json`,
	react: `${REGISTRY_BASE}/registry.json`,
	vue: `${REGISTRY_BASE_VUE}/registry.json`,
};

export const EXCLUSIONS_TITLE = "What is not in the registries";
export const EXCLUSIONS_INTRO =
	"The registries ship component code only. These stay out, per framework (paths relative to each package's source tree):";

export const INDEXES_TITLE = "Registry indexes";
export const INDEXES_INTRO = `Each registry lists every item it serves. The files follow the JSON Schemas the CLIs publish, and every item names its author and ${license} licence.`;
