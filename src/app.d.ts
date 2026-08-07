// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	/** Injected by Vite `define` from package.json (see vite.config.ts). */
	const __PKG_VERSION__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			user?: { username: string };
			githubToken?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
