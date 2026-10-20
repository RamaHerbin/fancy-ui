<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/scroll-anchor/BasicUsage.svelte.
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { ScrollAnchor } from "fancy-ui-vue";

/** How long each line waits before the next one lands. */
const TICK_MS = 800;
/** How long the finished transcript sits there before the run starts over. */
const HOLD_MS = 3200;

const LINES = [
	"Reading the billing schema…",
	"`invoices` has a `status` column, four values.",
	"Only `open` and `past_due` count as owed.",
	"Joining `customers` to get a name per row.",
	"Two customers have no row in `customers` — left join, then.",
	"Grouping by customer, summing `amount_due`.",
	"Ordering by the total, largest first.",
	"Capping at twenty so the answer stays readable.",
	"Running it against the read replica…",
	"18 rows. Two of them are the same customer under different ids.",
	"Folding those together on `email`.",
	"17 rows. That's the answer.",
];

const shown = ref(1);
const streaming = ref(true);
const visible = computed(() => LINES.slice(0, shown.value));

let timer: ReturnType<typeof setTimeout> | undefined;

function step() {
	if (shown.value < LINES.length) {
		shown.value += 1;
		timer = setTimeout(step, TICK_MS);
		return;
	}
	timer = setTimeout(() => {
		shown.value = 1;
		timer = setTimeout(step, TICK_MS);
	}, HOLD_MS);
}

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		shown.value = LINES.length;
		streaming.value = false;
		return;
	}
	timer = setTimeout(step, TICK_MS);
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<div class="flex w-full max-w-lg flex-col gap-3 p-6">
		<ScrollAnchor
			sound
			:active="streaming"
			max-height="13rem"
			class="border-border bg-card/50 rounded-lg border"
		>
			<div class="flex flex-col gap-2 p-4 font-mono text-xs leading-relaxed">
				<p v-for="(line, i) in visible" :key="`${line}#${i}`" class="text-muted-foreground">
					{{ line }}
				</p>
			</div>
		</ScrollAnchor>

		<p class="text-muted-foreground text-xs">
			The region stays pinned to the last line while the transcript grows. Scroll up mid-stream and
			it lets go — a “Jump to latest” pill appears, and pressing it hands the region back to the
			stream.
		</p>
	</div>
</template>
