<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/reasoning-panel/BasicUsage.svelte.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ReasoningPanel } from "fancy-ui-vue";

const TRACE = [
	"The user wants the total per region, but the orders table only stores a city.",
	" So I need the city → region mapping before anything else can be aggregated.",
	" There is a `regions` lookup table with a `city_id` foreign key — that joins cleanly.",
	" One catch: cities with no region row would vanish under an inner join.",
	" A left join keeps them and buckets them as “Unassigned”, which is the safer default.",
	" Grouping on the region name rather than its id keeps the output readable.",
];

/** How long a finished trace rests before the loop starts over. */
const REST_MS = 1200;
const CHUNK_MS = 220;

const text = ref("");
const streaming = ref(false);
const since = ref<number | undefined>(undefined);
const open = ref<boolean | undefined>(undefined);

let timer: ReturnType<typeof setTimeout> | undefined;
let i = 0;

function tick() {
	if (i < TRACE.length) {
		text.value += TRACE[i];
		i += 1;
		timer = setTimeout(tick, CHUNK_MS);
		return;
	}
	streaming.value = false;
	timer = setTimeout(restart, REST_MS);
}

function restart() {
	text.value = "";
	i = 0;
	streaming.value = true;
	since.value = Date.now();
	timer = setTimeout(tick, CHUNK_MS);
}

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		text.value = TRACE.join("");
		open.value = true;
		return;
	}
	restart();
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
	<div class="w-full max-w-xl">
		<ReasoningPanel
			sound
			:text="text"
			:streaming="streaming"
			:since="since"
			v-model:open="open"
			label="Reasoning"
		/>
		<p class="text-muted-foreground mt-3 text-xs">
			Streams while it thinks, then folds itself into a summary. Click the header at any point and
			it stays exactly where you left it.
		</p>
	</div>
</template>
