<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/artifact-card/BasicUsage.svelte.
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ArtifactCard } from "fancy-ui-vue";
import type { StreamStatus } from "fancy-ui-vue";

const DRAFTS = [
	"Revenue closed the quarter at 4.2M, six percent ahead of plan, and for the first time the mid-market segment outgrew enterprise. Two things drove it: the self-serve trial that shipped in May, which now accounts for a third of new logos, and a pricing change nobody expected much from. Churn is flat. The one number worth arguing about is expansion, which slipped for a second quarter running and is the reason next quarter's forecast is not simply this quarter plus growth.",
	"Revenue closed the quarter at 4.2M, six percent ahead of plan — the first time mid-market has outgrown enterprise. Two things drove it: the self-serve trial shipped in May, now a third of new logos, and a pricing change nobody expected much from. Churn is flat. Expansion is the number worth arguing about: it slipped for a second quarter running, which is why next quarter's forecast is not this quarter plus growth. Recommendation: hold the pricing, fund the expansion motion.",
];

const CHUNK = 4;
const TICK_MS = 22;
const LEAD_MS = 500;
const HOLD_MS = 2600;

const version = ref(1);
const status = ref<StreamStatus>("idle");
const preview = ref("");
const opened = ref(false);
const copied = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;

function stop() {
	clearTimeout(timer);
	timer = undefined;
}

function settleOn(n: number) {
	stop();
	version.value = n;
	preview.value = DRAFTS[n - 1];
	status.value = "done";
}

function writeDraft(n: number) {
	version.value = n;
	status.value = "streaming";
	const full = DRAFTS[n - 1];
	let cut = CHUNK;
	preview.value = full.slice(0, cut);

	const tick = () => {
		cut = Math.min(full.length, cut + CHUNK);
		preview.value = full.slice(0, cut);
		timer = setTimeout(cut < full.length ? tick : finish, TICK_MS);
	};

	const finish = () => {
		status.value = "done";
		timer = setTimeout(() => writeDraft(n === DRAFTS.length ? 1 : n + 1), HOLD_MS);
	};

	timer = setTimeout(tick, LEAD_MS);
}

onMounted(() => {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		settleOn(DRAFTS.length);
		return;
	}
	writeDraft(1);
});

onBeforeUnmount(stop);
</script>

<template>
	<div class="flex w-full max-w-xl flex-col gap-2 p-6">
		<ArtifactCard
			sound
			title="Q3 revenue review"
			kind="Memo"
			:version="version"
			:version-count="DRAFTS.length"
			:on-version-change="settleOn"
			:status="status"
			:preview="preview"
			:on-open="() => (opened = !opened)"
		>
			<template #actions>
				<button
					type="button"
					class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-6 cursor-pointer items-center justify-center rounded transition-colors focus-visible:ring-1 focus-visible:outline-none"
					:aria-label="copied ? 'Copied' : 'Copy document'"
					@click="copied = !copied"
				>
					<svg
						v-if="copied"
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="m5 13 4 4L19 7" />
					</svg>
					<svg
						v-else
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<rect x="9" y="9" width="11" height="11" rx="2" />
						<path d="M5 15V5a2 2 0 0 1 2-2h10" />
					</svg>
				</button>
			</template>
		</ArtifactCard>

		<p class="text-muted-foreground mt-1 text-xs">
			{{
				opened
					? "That would open the document in a side panel — the copy button kept its own click."
					: "The card is writing itself, then rewriting itself. Click it to open, or use the arrows to settle on a draft."
			}}
		</p>

		<ArtifactCard title="Q3 cohort appendix" kind="Spreadsheet" status="error" />

		<p class="text-muted-foreground text-xs">
			A failure says so in words, in a tinted footer, rather than in the border alone.
		</p>
	</div>
</template>
