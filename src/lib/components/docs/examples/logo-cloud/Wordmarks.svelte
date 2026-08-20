<script lang="ts">
	import { StaticLogoCloud } from "$lib/fancy-ui/logo-cloud";
	import type { Wordmark } from "$lib/fancy-ui/logo-cloud";

	const wordmarks: Wordmark[] = [
		{ name: "Acme Corp", size: 22, weight: 700 },
		{ name: "Nimbus Labs", size: 20, weight: 400, italic: true },
		{ name: "FOUNDRY", size: 18, weight: 900, tracking: 2, transform: "uppercase" },
		{ name: "Cartwright & Sons", size: 20, weight: 400, serif: true },
		{ name: "Vertex", size: 22, weight: 700, tracking: 1 },
	];
</script>

<div class="overflow-hidden rounded-lg border">
	<StaticLogoCloud title="Trusted by" {wordmarks} />
</div>
