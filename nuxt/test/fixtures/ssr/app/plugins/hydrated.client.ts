// Marks the document once Nuxt has finished hydrating, so the browser tests
// wait on the framework's own signal instead of a timeout. Nuxt flips
// `isHydrating` in its own `app:suspense:resolve` hook, registered before
// this plugin's, so by the time this one runs the flag is settled.
export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.hooks.hookOnce("app:suspense:resolve", () => {
		document.documentElement.dataset.hydrated = nuxtApp.isHydrating ? "pending" : "true";
	});
});
