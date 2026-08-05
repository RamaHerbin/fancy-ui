<script lang="ts" module>
	export interface FancyProviderProps {
		/** The active skin. Changing it re-flows the whole subtree live. */
		skin: Skin;
		/** Scope `.dark` to this subtree for skins whose colorScheme is "dark". */
		manageColorScheme?: boolean;
		class?: string;
		children?: Snippet;
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import { browser } from "$app/environment";
	import { cn } from "$lib/utils.js";
	import type { Skin } from "./types.js";
	import { setSkinContext } from "./context.js";
	import "./cameleon.css";

	let {
		skin,
		manageColorScheme = false,
		class: className = "",
		children,
	}: FancyProviderProps = $props();

	// Getter, not a plain value — this is what makes a live skin switch reactive.
	setSkinContext({
		get skin() {
			return skin;
		},
	});

	// Skin tokens as scoped inline CSS variables. Overriding these var names on
	// this element re-flows every utility that reads them, for THIS subtree only.
	// The provider never touches <html>, so it can't fight the global theme store.
	const styleVars = $derived(
		Object.entries(skin.tokens)
			.map(([k, v]) => `${k}:${v}`)
			.join(";")
	);

	// Inject skin webfonts once (deduped by id), client-only so SSR stays clean.
	$effect(() => {
		if (!browser || !skin.fonts) return;
		for (const font of skin.fonts) {
			if (document.getElementById(font.id)) continue;
			const link = document.createElement("link");
			link.id = font.id;
			link.rel = "stylesheet";
			link.href = font.href;
			document.head.appendChild(link);
		}
	});
</script>

<div
	data-skin={skin.name}
	class={cn("cameleon-root", manageColorScheme && skin.colorScheme === "dark" && "dark", className)}
	style={styleVars}
>
	{@render children?.()}
</div>
