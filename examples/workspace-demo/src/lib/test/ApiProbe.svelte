<script lang="ts" module>
	import type { ApiConfig } from "$lib/data/api.js";

	export type ProbeEntry =
		| { phase: "script" | "mount"; config: ApiConfig }
		| { phase: "first-call"; ok: true; ms: number }
		| { phase: "first-call"; ok: false; code: string; ms: number };
</script>

<script lang="ts">
	// Test double for a screen: it reads the shared API the way a real screen
	// does, once in its script and once on mount, and starts its first call
	// from the mount hook. Used only by src/routes/layout.test.ts.
	import { onMount } from "svelte";
	import { api } from "$lib/data/api.js";

	const props: { record: (entry: ProbeEntry) => void } = $props();
	const record = (entry: ProbeEntry) => props.record(entry);

	record({ phase: "script", config: api.config });

	onMount(() => {
		record({ phase: "mount", config: api.config });
		const started = performance.now();
		const ms = () => performance.now() - started;
		api.getProfile().then(
			() => record({ phase: "first-call", ok: true, ms: ms() }),
			(error: { code?: string }) =>
				record({ phase: "first-call", ok: false, code: error.code ?? "unknown", ms: ms() })
		);
	});
</script>

<p>probe</p>
