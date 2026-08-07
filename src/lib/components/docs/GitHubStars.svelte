<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";

	interface Props {
		repo?: string;
		class?: string;
	}

	let { repo = "ramaherbin/fancy-ui", class: className = "" }: Props = $props();

	const CACHE_KEY = "fancyui:github-stars";
	const CACHE_TTL = 60 * 60 * 1000; // 1h — avoids hammering the unauthenticated API (60 req/h/IP)

	let stars = $state<number | null>(null);

	const formatted = $derived(
		stars === null
			? null
			: new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(stars)
	);

	onMount(async () => {
		try {
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const { value, at } = JSON.parse(cached) as { value: number; at: number };
				if (typeof value === "number" && Date.now() - at < CACHE_TTL) {
					stars = value;
					return;
				}
			}
		} catch {
			// Corrupt cache: ignore and refetch.
		}

		try {
			const res = await fetch(`https://api.github.com/repos/${repo}`);
			if (!res.ok) return;
			const data = (await res.json()) as { stargazers_count?: unknown };
			if (typeof data.stargazers_count === "number") {
				stars = data.stargazers_count;
				localStorage.setItem(CACHE_KEY, JSON.stringify({ value: stars, at: Date.now() }));
			}
		} catch {
			// Offline or rate-limited: render nothing.
		}
	});
</script>

{#if formatted}
	<span class={cn("inline-flex items-center gap-1 tabular-nums", className)}>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
			/>
		</svg>
		{formatted}
	</span>
{/if}
