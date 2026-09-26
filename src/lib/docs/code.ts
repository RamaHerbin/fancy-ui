/**
 * Docs examples import through the repo-internal `$lib/fancy-ui` path; a
 * consumer imports the package. Every place that shows example source (the
 * docs page, the Markdown pages, llms-full.txt) rewrites it the same way.
 */
export function toConsumerImports(src: string, pkg = "fancy-ui-svelte"): string {
	return src.replace(/(["'])\$lib\/fancy-ui(?:\/[^"']*)?\1/g, `$1${pkg}$1`);
}
