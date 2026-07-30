/**
 * Site-wide constants for the docs site.
 *
 * App-side only: this lives outside `src/lib/fancy-ui/`, and `files` in
 * package.json whitelists `dist/fancy-ui` + utils/types, so nothing here is
 * published to npm.
 */

import { getAllComponents } from "$lib/fancy-ui/registry.js";

/** Canonical origin, no trailing slash — every absolute URL is built from it. */
export const SITE_URL = "https://fancy-ui.rama.app";

export const SITE_NAME = "FancyUI";

/** 1200×630 social card served from static/. */
export const DEFAULT_OG_IMAGE = "/og.png";

/** Read from the registry so the number in the copy can never drift. */
export const COMPONENT_COUNT = getAllComponents().length;

export const SITE_DESCRIPTION = `${COMPONENT_COUNT} animated UI components for Svelte 5 — WebGL, GSAP and CSS motion, styled with Tailwind CSS v4.`;

/** Resolve a site-relative path or an already-absolute URL to an absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
	return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
}
