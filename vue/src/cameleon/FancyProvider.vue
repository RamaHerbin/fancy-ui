<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { Skin } from "./types.js";

export interface FancyProviderProps {
	/** The active skin. Changing it re-flows the whole subtree live. */
	skin: Skin;
	/** Scope `.dark` to this subtree for skins whose colorScheme is "dark". */
	manageColorScheme?: boolean;
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onMounted, watch, type CSSProperties } from "vue";
import { cn } from "../utils.js";
import { provideSkin } from "./context.js";
import "./cameleon.css";

defineOptions({ name: "FancyProvider", inheritAttrs: false });

const {
	skin,
	manageColorScheme = false,
	class: className = "",
} = defineProps<FancyProviderProps>();

defineSlots<{ default?: () => unknown }>();

// Getter, not a plain value — this is what makes a live skin switch reactive.
provideSkin({
	get skin() {
		return skin;
	},
});

// Skin tokens as scoped inline CSS variables. Overriding these var names on
// this element re-flows every utility that reads them, for THIS subtree only.
// The provider never touches <html>, so it can't fight the global theme store.
// An object, never a style string: a string goes through `cssText`, which drops
// custom properties under jsdom.
const styleVars = computed(() => ({ ...skin.tokens }) as CSSProperties);

// Inject skin webfonts once (deduped by id), client-only so SSR stays clean.
// `onMounted` covers the first paint and the post-flush watcher covers a live
// skin swap; neither ever runs on the server.
function injectSkinFonts() {
	const fonts = skin.fonts;
	if (!fonts) return;
	for (const font of fonts) {
		if (document.getElementById(font.id)) continue;
		const link = document.createElement("link");
		link.id = font.id;
		link.rel = "stylesheet";
		link.href = font.href;
		document.head.appendChild(link);
	}
}

onMounted(injectSkinFonts);
watch(() => skin.fonts, injectSkinFonts, { flush: "post" });
</script>

<template>
	<div
		:data-skin="skin.name"
		:class="cn('cameleon-root', manageColorScheme && skin.colorScheme === 'dark' && 'dark', className)"
		:style="styleVars"
	>
		<slot />
	</div>
</template>
