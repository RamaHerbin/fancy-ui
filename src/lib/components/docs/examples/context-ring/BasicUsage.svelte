<script lang="ts">
	import { ContextRing } from "$lib/fancy-ui/context-ring";
	import type { TokenUsageData } from "$lib/fancy-ui/_internals/ai-types.js";

	// Nothing is on a timer here: every ring is a fixed reading and the popover
	// only moves when you move it, so there is no rig to hold still for reduced
	// motion and no effect in this file at all.
	const comfortable: TokenUsageData = { used: 12_400, max: 200_000 };
	const warning: TokenUsageData = { used: 164_000, max: 200_000 };
	const critical: TokenUsageData = { used: 192_500, max: 200_000 };

	const detailed: TokenUsageData = {
		used: 84_300,
		max: 200_000,
		breakdown: [
			{ label: "System prompt", tokens: 1850 },
			{ label: "Transcript", tokens: 61_200 },
			{ label: "Tool results", tokens: 18_400 },
			{ label: "Attachments", tokens: 2850 },
		],
	};
</script>

<div class="flex w-full max-w-xl flex-col gap-6 p-6">
	<div class="flex flex-wrap items-center gap-8">
		<ContextRing usage={comfortable} />
		<ContextRing usage={warning} />
		<ContextRing usage={critical} />
	</div>

	<p class="text-muted-foreground text-xs">
		The band shifts at 75% and again at 90%, using the same run-status colours as the rest of the AI
		family. The arc's length says the same thing as its hue, so neither is load-bearing on its own.
	</p>

	<div class="border-border flex items-center gap-3 border-t pt-6">
		<ContextRing usage={detailed} size={34} strokeWidth={4} expandable />
		<span class="text-muted-foreground text-xs">
			Press the ring for the breakdown. Escape closes it.
		</span>
	</div>
</div>
