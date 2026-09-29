<script lang="ts">
	import type { ComponentMeta } from "$lib/types.js";
	import type { MessageKey } from "$lib/i18n/messages/en.js";
	import { t, tCategory } from "$lib/stores";
	// Written by scripts/build-component-thumbs.mjs: the slugs that have a capture in both themes.
	import thumbs from "./thumbs.json";

	interface Props {
		component: ComponentMeta;
	}

	let { component }: Props = $props();

	const hasThumb = $derived((thumbs as Record<string, boolean>)[component.slug] === true);

	/** A stable hue per slug, so the fallback tiles of neighbouring cards don't all look alike. */
	const hue = $derived([...component.slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7));

	const groupClass: Record<ComponentMeta["group"], string> = {
		core: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
		fancy: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
	};
</script>

<a
	href="/docs/components/{component.slug}"
	class="component-card bg-card group focus-visible:ring-ring flex flex-col overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-200 hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
>
	<!-- Preview: a capture of the component's own doc stage, or a generated tile until one exists. -->
	<div class="bg-muted/30 relative aspect-[16/10] overflow-hidden border-b">
		{#if hasThumb}
			<img
				src="/thumbs/light/{component.slug}.webp"
				alt=""
				width="720"
				height="450"
				loading="lazy"
				decoding="async"
				class="card-thumb h-full w-full object-cover dark:hidden"
			/>
			<img
				src="/thumbs/dark/{component.slug}.webp"
				alt=""
				width="720"
				height="450"
				loading="lazy"
				decoding="async"
				class="card-thumb hidden h-full w-full object-cover dark:block"
			/>
		{:else}
			<div
				class="card-thumb flex h-full w-full items-center justify-center"
				style:--tile-hue={hue}
				aria-hidden="true"
			>
				<span
					class="fallback-name text-foreground/70 px-6 text-center text-xl font-semibold tracking-tight"
				>
					{component.name}
				</span>
			</div>
		{/if}
	</div>

	<!-- Info -->
	<div class="flex flex-1 flex-col gap-1.5 p-4">
		<div class="flex items-center justify-between gap-2">
			<h3 data-toc-ignore class="text-foreground truncate text-sm font-semibold">
				{component.name}
			</h3>
			<svg
				class="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</div>
		<p class="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
			{component.description}
		</p>
		<div class="mt-auto flex items-center gap-1.5 pt-2">
			<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
				{tCategory(component.category)}
			</span>
			<span class="rounded-full px-2 py-0.5 text-[10px] font-medium {groupClass[component.group]}">
				{t(`group.${component.group}` as MessageKey)}
			</span>
			{#if component.status !== "done"}
				<span
					class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
				>
					{t("status.inProgress")}
				</span>
			{/if}
		</div>
	</div>
</a>

<style>
	.component-card:hover,
	.component-card:focus-visible {
		border-color: color-mix(in oklch, var(--foreground) 22%, var(--border));
	}

	.card-thumb {
		transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.component-card:hover .card-thumb,
	.component-card:focus-visible .card-thumb {
		transform: scale(1.035);
	}

	/* Fallback tile: a soft two-stop glow in the slug's hue over the muted stage. */
	div.card-thumb {
		background:
			radial-gradient(
				120% 90% at 20% 10%,
				oklch(0.72 0.14 var(--tile-hue) / 0.28),
				transparent 60%
			),
			radial-gradient(
				90% 80% at 85% 100%,
				oklch(0.65 0.16 calc(var(--tile-hue) + 60) / 0.22),
				transparent 65%
			);
	}

	@media (prefers-reduced-motion: reduce) {
		.card-thumb {
			transition: none;
		}
		.component-card:hover .card-thumb,
		.component-card:focus-visible .card-thumb {
			transform: none;
		}
	}
</style>
