import { onDestroy, onMount } from "svelte";

// Test instrumentation, not something an app needs: every island counts its
// mounts and destroys on `window.__fancyLife`, so the smoke can prove that
// ClientRouter navigations tear islands down instead of piling them up.
type Life = { mounts: Record<string, number>; destroys: Record<string, number> };

declare global {
	interface Window {
		__fancyLife?: Life;
	}
}

export function trackLifecycle(name: string) {
	onMount(() => {
		const life = (window.__fancyLife ??= { mounts: {}, destroys: {} });
		life.mounts[name] = (life.mounts[name] ?? 0) + 1;
	});
	onDestroy(() => {
		if (typeof window === "undefined") return;
		const life = (window.__fancyLife ??= { mounts: {}, destroys: {} });
		life.destroys[name] = (life.destroys[name] ?? 0) + 1;
	});
}
