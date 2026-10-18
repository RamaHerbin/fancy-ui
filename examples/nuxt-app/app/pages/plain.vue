<script setup lang="ts">
import type { PlanStepData } from "fancy-ui-vue";
import {
	cn,
	AgentPlan,
	BorderBeam,
	Marquee,
	ReviewCard,
	RainbowButton,
	ShimmerButton,
} from "fancy-ui-vue";

// SSR/hydration gate: exercises the package's plain, non-portalled,
// non-canvas components so `nuxt generate` renders them on the server and
// hydrates cleanly on the client.
const reviews = [
	{
		img: "https://avatar.vercel.sh/jack",
		name: "Jack",
		username: "@jack",
		body: "This is fantastic.",
	},
	{
		img: "https://avatar.vercel.sh/jill",
		name: "Jill",
		username: "@jill",
		body: "I love this library.",
	},
	{
		img: "https://avatar.vercel.sh/john",
		name: "John",
		username: "@john",
		body: "So easy to use.",
	},
];

// Covers every row shape AgentPlan draws: done, running with detail, nested
// substeps, error and pending.
const planSteps: PlanStepData[] = [
	{ id: "read", label: "Read the codebase", status: "done" },
	{
		id: "port",
		label: "Port the components",
		status: "running",
		detail: "Working through the form controls",
		substeps: [
			{ id: "port-input", label: "Input", status: "done" },
			{ id: "port-select", label: "Select", status: "running" },
		],
	},
	{ id: "lint", label: "Lint the package", status: "error", detail: "Two warnings to fix" },
	{ id: "ship", label: "Open the pull request", status: "pending" },
];
</script>

<template>
	<main :class="cn('mx-auto max-w-2xl p-8')">
		<h1 :class="cn('text-2xl font-semibold')">plain</h1>
		<div :class="cn('mt-4 flex flex-col gap-6')">
			<ShimmerButton>Shimmer button</ShimmerButton>

			<RainbowButton>Rainbow button</RainbowButton>

			<Marquee :class="cn('rounded-md border border-neutral-300 py-4')">
				<ReviewCard v-for="review in reviews" :key="review.username" v-bind="review" />
			</Marquee>

			<div :class="cn('relative overflow-hidden rounded-xl border border-neutral-300 p-6')">
				<p :class="cn('text-sm')">A card with a beam running round its border.</p>
				<BorderBeam :size="120" :duration="8" />
			</div>

			<AgentPlan :steps="planSteps" label="Release plan" />
		</div>
	</main>
</template>
