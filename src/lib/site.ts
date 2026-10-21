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
 * `fancy-ui-vue` ships with the 0.15 release train (first version 0.1.0,
 * .changeset/vue-0-1-0.md). The flag stays so the site can go back to
 * "source only" copy if the package ever has to be pulled from the registry.
 */
export const VUE_PACKAGE_PUBLISHED = true;

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

/** React and Vue package versions, baked in from react/ and vue/ package.json by Vite. */
export const REACT_PACKAGE_VERSION = __REACT_PKG_VERSION__;

export const VUE_PACKAGE_VERSION = __VUE_PKG_VERSION__;

/** Source and "edit this page" links always target the integration branch. */
export const SOURCE_BRANCH = "develop";

export const EDIT_BRANCH = "develop";

export const ISSUES_URL = `${GITHUB_URL}/issues`;

export const DISCUSSIONS_URL = `${GITHUB_URL}/discussions`;

export const CONTRIBUTING_URL = `${GITHUB_URL}/blob/${SOURCE_BRANCH}/CONTRIBUTING.md`;

export const CODE_OF_CONDUCT_URL = `${GITHUB_URL}/blob/${SOURCE_BRANCH}/CODE_OF_CONDUCT.md`;

export const SECURITY_URL = `${GITHUB_URL}/blob/${SOURCE_BRANCH}/SECURITY.md`;

const trimSlashes = (path: string) => path.replace(/^\/+/, "");

/** GitHub tree (folder or file) view of a repository path on the source branch. */
export function sourceTreeUrl(path: string): string {
	const rest = trimSlashes(path);
	return `${GITHUB_URL}/tree/${SOURCE_BRANCH}${rest ? `/${rest}` : ""}`;
}

/** GitHub web editor for a repository file on the edit branch. */
export function editUrl(path: string): string {
	return `${GITHUB_URL}/edit/${EDIT_BRANCH}/${trimSlashes(path)}`;
}

export interface NewIssueOptions {
	template?: string;
	title?: string;
	labels?: string[];
	body?: string;
}

/** Pre-filled "new issue" URL; every value goes through URLSearchParams. */
export function newIssueUrl({ template, title, labels, body }: NewIssueOptions): string {
	const params = new URLSearchParams();
	if (template) params.set("template", template);
	if (title) params.set("title", title);
	if (labels?.length) params.set("labels", labels.join(","));
	if (body) params.set("body", body);
	const query = params.toString();
	return `${ISSUES_URL}/new${query ? `?${query}` : ""}`;
}

export const SITE_DESCRIPTION = `${COMPONENT_COUNT} UI components for Svelte 5, React and Vue — core primitives plus WebGL, GSAP and CSS motion, styled with Tailwind CSS v4.`;

/** Resolve a site-relative path or an already-absolute URL to an absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
	return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${SITE_URL}${pathOrUrl}`;
}
