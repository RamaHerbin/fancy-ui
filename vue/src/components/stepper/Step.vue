<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface StepProps {
	/**
	 * The step's primary label. Required: with the default slot also
	 * omitted, a clickable step's only accessible text is its `sr-only`
	 * status span — every upcoming step in the same `Stepper` would then
	 * read as the identical "not started, button" with nothing to tell them
	 * apart.
	 */
	label: string;
	/** Optional secondary line shown under the label. */
	description?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { STEPPER_KEY } from "./types.js";

defineOptions({ name: "Step", inheritAttrs: false });

const { label, description, class: className } = defineProps<StepProps>();

defineSlots<{
	/** Overrides the bullet's default content (checkmark / number / outline). */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLLIElement>("el");
defineExpose({ ref: el });

// Undefined outside a Stepper: the step then has no shared index or status
// to derive, and renders as a plain, always-"upcoming", never-clickable
// item rather than throwing.
const stepper = STEPPER_KEY.useOptional();

// `useFancyId()` rather than `internals/id.ts`'s `uid()`: this needs to be
// stable and available immediately, including during SSR, and `uid()` is
// client-only by design (see its own doc comment).
const id = useFancyId();

// Registers on mount, unregisters on unmount. `onMounted`/`onBeforeUnmount`
// run pre-paint in the same flush as everything else here, so every number,
// status colour, connector and `aria-current` on the rail is derived from
// the index this settles before the browser ever paints a frame.
let unregister: (() => void) | undefined;
onMounted(() => {
	unregister = stepper?.register(id);
});
onBeforeUnmount(() => {
	unregister?.();
});

const index = computed(() => (stepper ? stepper.indexOf(id) : -1));

type StepStatus = "done" | "current" | "upcoming";
const status = computed<StepStatus>(() => {
	if (!stepper || index.value === -1) return "upcoming";
	if (index.value < stepper.current) return "done";
	if (index.value === stepper.current) return "current";
	return "upcoming";
});

const orientation = computed(() => stepper?.orientation ?? "horizontal");
const clickable = computed(() => stepper?.clickable ?? false);
const isFirst = computed(() => index.value === 0);
const isLast = computed(() => (stepper ? index.value === stepper.count - 1 : true));

// The segment connecting this step back to the previous one is "done"
// exactly when that previous step is done — i.e. this step's own index is
// at or before the active one.
const connectorDone = computed(() => (stepper ? index.value <= stepper.current : false));

function handleClick() {
	if (!stepper || !clickable.value || index.value === -1) return;
	stepper.select(index.value);
}

const STATUS_TEXT: Record<StepStatus, string> = {
	done: "completed",
	current: "current step",
	upcoming: "not started",
};

const bulletClasses = computed(() =>
	cn(
		"ft-step-bullet relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
		status.value === "done" && "ft-step-bullet-done",
		status.value === "current" && "ft-step-bullet-current",
		status.value === "upcoming" && "border-border text-muted-foreground border-[1.5px] bg-transparent"
	)
);
</script>

<template>
	<li
		ref="el"
		:class="
			cn(
				'ft-step flex',
				orientation === 'vertical'
					? cn('flex-row items-stretch gap-3', isLast ? 'pb-0' : 'pb-6')
					: cn('flex-col items-center', isFirst ? 'flex-none' : 'flex-1'),
				className
			)
		"
		:data-status="status"
		:data-orientation="orientation"
		:aria-current="status === 'current' ? 'step' : undefined"
	>
		<template v-if="orientation === 'horizontal'">
			<div class="flex w-full items-center">
				<span
					v-if="!isFirst"
					:class="
						cn(
							'ft-step-connector mt-[13px] h-0.5 flex-1',
							connectorDone ? 'ft-step-connector-done' : 'bg-border'
						)
					"
					aria-hidden="true"
				></span>
				<button
					v-if="clickable"
					type="button"
					class="ft-step-trigger flex shrink-0 cursor-pointer flex-col items-center gap-1.5 px-1 focus-visible:outline-none"
					@click="handleClick"
				>
					<span :class="bulletClasses" :data-status="status">
						<slot v-if="$slots.default" />
						<svg
							v-else-if="status === 'done'"
							class="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
						<span v-else aria-hidden="true">{{ index + 1 }}</span>
						<span class="sr-only"> {{ STATUS_TEXT[status] }}</span>
					</span>
					<span class="flex flex-col items-center text-center">
						<span
							v-if="label"
							:class="cn('text-xs', status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground')"
						>
							{{ label }}
						</span>
						<span v-if="description" class="text-muted-foreground text-xs">{{ description }}</span>
					</span>
				</button>
				<div v-else class="ft-step-trigger flex shrink-0 flex-col items-center gap-1.5 px-1">
					<span :class="bulletClasses" :data-status="status">
						<slot v-if="$slots.default" />
						<svg
							v-else-if="status === 'done'"
							class="size-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
						<span v-else aria-hidden="true">{{ index + 1 }}</span>
						<span class="sr-only"> {{ STATUS_TEXT[status] }}</span>
					</span>
					<span class="flex flex-col items-center text-center">
						<span
							v-if="label"
							:class="cn('text-xs', status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground')"
						>
							{{ label }}
						</span>
						<span v-if="description" class="text-muted-foreground text-xs">{{ description }}</span>
					</span>
				</div>
			</div>
		</template>
		<template v-else>
			<div class="flex flex-col items-center self-stretch">
				<span :class="bulletClasses" :data-status="status">
					<slot v-if="$slots.default" />
					<svg
						v-else-if="status === 'done'"
						class="size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M20 6 9 17l-5-5" />
					</svg>
					<span v-else aria-hidden="true">{{ index + 1 }}</span>
					<span class="sr-only"> {{ STATUS_TEXT[status] }}</span>
				</span>
				<span
					v-if="!isLast"
					:class="
						cn(
							'ft-step-connector my-1 w-0.5 flex-1',
							connectorDone ? 'ft-step-connector-done' : 'bg-border'
						)
					"
					aria-hidden="true"
				></span>
			</div>
			<button
				v-if="clickable"
				type="button"
				class="ft-step-trigger flex cursor-pointer flex-col gap-0.5 pt-0.5 text-left focus-visible:outline-none"
				@click="handleClick"
			>
				<span class="flex flex-col">
					<span
						v-if="label"
						:class="cn('text-xs', status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground')"
					>
						{{ label }}
					</span>
					<span v-if="description" class="text-muted-foreground text-xs">{{ description }}</span>
				</span>
			</button>
			<div v-else class="ft-step-trigger flex flex-col gap-0.5 pt-0.5 text-left">
				<span class="flex flex-col">
					<span
						v-if="label"
						:class="cn('text-xs', status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground')"
					>
						{{ label }}
					</span>
					<span v-if="description" class="text-muted-foreground text-xs">{{ description }}</span>
				</span>
			</div>
		</template>
	</li>
</template>

<style scoped>
/*
 * The only place this component reaches for the brand purple — the
 * current bullet's fill/halo and a done segment's connector. No
 * semantic token owns it, so it's declared locally with a light-dark()
 * fallback, retintable from higher up the tree via `--ft-accent`.
 * Mirrors ToggleGroupItem's identical `--ft-toggle-group-accent`
 * pattern. Never redeclare `--ft-accent` itself: that would shadow
 * whatever an ancestor set, the exact bug an earlier wave shipped in
 * `Link`.
 */
.ft-step {
	--ft-nav-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
}

/*
 * A step's whole visible state — the bullet's fill, its label colour, the
 * halo around the current one, and the connector behind it — used to arrive
 * in a single frame. It now eases in on the same clock as everything else
 * in the library.
 *
 * Declared outside any `prefers-reduced-motion` query on purpose: none of
 * these three properties moves anything. A colour that crossfades and a
 * static ring that appears are state changes, not travel, and suppressing
 * them under reduced motion would make the stepper flicker rather than
 * settle. The focus ring is safe from this list because it lives on a
 * different element (`.ft-step-trigger`), so no `box-shadow` here is ever
 * a focus indicator.
 *
 * 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout
 */
.ft-step-bullet,
.ft-step-connector {
	--ft-step-signal: var(--ft-step-signal-duration, var(--ft-duration-fast, 150ms))
		var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
	transition:
		background-color var(--ft-step-signal),
		color var(--ft-step-signal),
		box-shadow var(--ft-step-signal);
}

.ft-step-bullet-done {
	background: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
	color: light-dark(oklch(1 0 0), oklch(0.15 0 0));
}

.ft-step-bullet-current {
	background: var(--ft-nav-accent);
	color: light-dark(oklch(1 0 0), oklch(0.15 0 0));
	box-shadow: 0 0 0 4px color-mix(in oklab, var(--ft-nav-accent) 20%, transparent);
}

.ft-step-connector-done {
	background: var(--ft-status-done, light-dark(oklch(0.5 0.14 145), oklch(0.72 0.15 145)));
}

.ft-step-trigger:focus-visible {
	outline: none;
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
	border-radius: 0.375rem;
}
</style>
