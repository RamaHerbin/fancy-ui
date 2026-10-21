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

	/**
	 * `value`/`at`: the last count the API returned and when. `retryAt`: set after a refusal
	 * (a 403 rate limit, most often), so the next pages back off instead of asking again.
	 */
	interface Cached {
		value: number | null;
		at: number;
		retryAt?: number;
	}

	function readCache(): Cached | null {
		try {
			const raw = localStorage.getItem(CACHE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw) as Partial<Cached>;
			return {
				value: typeof parsed.value === "number" ? parsed.value : null,
				at: typeof parsed.at === "number" ? parsed.at : 0,
				retryAt: typeof parsed.retryAt === "number" ? parsed.retryAt : undefined,
			};
		} catch {
			// Blocked storage or a corrupt entry: behave as if nothing was cached.
			return null;
		}
	}

	function writeCache(entry: Cached) {
		try {
			localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
		} catch {
			// Blocked or full storage: the count still shows, it is just fetched again next time.
		}
	}

	/** When the API says the rate limit resets (seconds since epoch), else an hour from now. */
	function retryAfter(res: Response, now: number): number {
		const reset = Number(res.headers.get("x-ratelimit-reset"));
		return Number.isFinite(reset) && reset * 1000 > now ? reset * 1000 : now + CACHE_TTL;
	}

	onMount(async () => {
		const now = Date.now();
		const cached = readCache();
		// A stale count is still better than none while we refresh (or back off).
		if (cached?.value != null) stars = cached.value;
		if (cached?.value != null && now - cached.at < CACHE_TTL) return;
		if (cached?.retryAt && now < cached.retryAt) return;

		try {
			const res = await fetch(`https://api.github.com/repos/${repo}`);
			if (!res.ok) {
				// Unauthenticated requests share 60 an hour per IP, so a 403 is routine, not an
				// error: no console noise, keep any stale count, and wait before asking again.
				writeCache({
					value: cached?.value ?? null,
					at: cached?.at ?? 0,
					retryAt: retryAfter(res, now),
				});
				return;
			}
			const data = (await res.json()) as { stargazers_count?: unknown };
			if (typeof data.stargazers_count === "number") {
				stars = data.stargazers_count;
				writeCache({ value: stars, at: Date.now() });
			}
		} catch {
			// Offline: render the cached count if there is one, nothing otherwise.
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
