export const SITE_NAME = "fancy-ui-react";

export const SITE_DESCRIPTION =
	"144 animated React components: WebGL, GSAP and CSS motion, styled with Tailwind CSS v4, with an opt-in sound layer and six cameleon skins.";

/** Set at build time when the demo is deployed; canonical/og:url are only emitted when known. */
export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? null;

export const URLS = {
	npm: "https://www.npmjs.com/package/fancy-ui-react",
	npmSvelte: "https://www.npmjs.com/package/fancy-ui-svelte",
	github: "https://github.com/RamaHerbin/fancy-ui/tree/main/react",
	releases: "https://github.com/RamaHerbin/fancy-ui/releases",
	docs: "https://fancy-ui.rama.app/",
	license: "https://opensource.org/licenses/MIT",
} as const;
