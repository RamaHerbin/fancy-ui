/** Options for the `fancyUi` key in nuxt.config. */
export interface ModuleOptions {
	/**
	 * Register fancy-ui-vue components for auto-import.
	 * `true` registers every component, an array registers only those export
	 * names (e.g. `["ShimmerButton", "BorderBeam"]`), `false` registers none.
	 * @default true
	 */
	components: boolean | string[];
	/**
	 * Prefix added to every auto-imported component name:
	 * `ShimmerButton` becomes `<FancyShimmerButton>`.
	 * @default "Fancy"
	 */
	prefix: string;
	/**
	 * Add `fancy-ui-vue/styles.css` (the components' own stylesheet) to the app.
	 * The Tailwind entry (`fancy-ui-vue/tailwind.css`) stays in your CSS.
	 * @default true
	 */
	css: boolean;
	/**
	 * Auto-import the sound composables (`useSound`, `useSoundCue`, …).
	 * @default true
	 */
	composables: boolean;
}
