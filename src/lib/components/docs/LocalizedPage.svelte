<script lang="ts">
	import { getLocale } from "$lib/stores";
	import { defaultLocale } from "$lib/i18n/locales.js";
	import type { Component } from "svelte";

	let { page }: { page: string } = $props();

	// Eagerly collect every localized prose page: "<name>.<locale>.svx".
	const modules = import.meta.glob("../../i18n/pages/*.svx", { eager: true }) as Record<
		string,
		{ default: Component }
	>;

	const byKey: Record<string, Component> = {};
	for (const [path, mod] of Object.entries(modules)) {
		const key = path
			.split("/")
			.pop()
			?.replace(/\.svx$/, "");
		if (key) byKey[key] = mod.default;
	}

	const locale = $derived(getLocale());
	const Prose = $derived(byKey[`${page}.${locale}`] ?? byKey[`${page}.${defaultLocale}`] ?? null);
</script>

{#if Prose}
	<Prose />
{/if}
