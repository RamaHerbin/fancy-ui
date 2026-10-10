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

/** npm package name — the distributable behind the brand. */
export const PACKAGE_NAME = "fancy-ui-svelte";

/** The React port of the same components, published separately. */
export const REACT_PACKAGE_NAME = "fancy-ui-react";

export const REACT_PACKAGE_URL = `https://www.npmjs.com/package/${REACT_PACKAGE_NAME}`;

/** The Vue port of the same components. */
export const VUE_PACKAGE_NAME = "fancy-ui-vue";

/**
 * Checked against the npm registry on 2026-10-02: `fancy-ui-vue` returns 404
 * (first release pending in .changeset/vue-0-1-0.md). Until it ships, the site
 * must not print an install command for it. Flip this constant when it does.
 */
export const VUE_PACKAGE_PUBLISHED = false;

/** 1200×630 social card served from static/. */
export const DEFAULT_OG_IMAGE = "/og.png";

export const GITHUB_URL = "https://github.com/RamaHerbin/fancy-ui";

/** npm page once published; the package folder on GitHub until then. */
export const VUE_PACKAGE_URL = VUE_PACKAGE_PUBLISHED
	? `https://www.npmjs.com/package/${VUE_PACKAGE_NAME}`
	: `${GITHUB_URL}/tree/main/vue`;

export const REACT_PACKAGE_GITHUB_URL = `${GITHUB_URL}/tree/main/react`;

export const VUE_PACKAGE_GITHUB_URL = `${GITHUB_URL}/tree/main/vue`;

export const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;

/**
 * Stable `@id` anchors for the structured-data graph. Every page that emits a
 * node about the site or the package reuses these so crawlers merge the
 * fragments into one entity instead of inventing duplicates.
 */
export const SCHEMA_WEBSITE_ID = `${SITE_URL}/#website`;

export const SCHEMA_APP_ID = `${SITE_URL}/#app`;

/** Read from the registry so the number in the copy can never drift. */
export const COMPONENT_COUNT = getAllComponents().length;

/** Package version, baked in from package.json by Vite (see vite.config.ts). */
export const PACKAGE_VERSION = __PKG_VERSION__;

export const SITE_DESCRIPTION = `${COMPONENT_COUNT} UI components for Svelte 5 — core primitives plus WebGL, GSAP and CSS motion, styled with Tailwind CSS v4.`;

/** Resolve a site-relative path or an already-absolute URL to an absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
	return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
}
