<script lang="ts">
import type { HTMLAttributes } from "vue";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarShape = "circle" | "square";

export interface AvatarProps {
	/** Image URL. While it loads a skeleton shows; if it fails the initials show. */
	src?: string;
	/**
	 * The accessible name, and the one required decision whenever `src` is set:
	 * describe the image, or pass `""` to mark the avatar decorative (beside
	 * a visible name that already says who it is). Falls back to `name`.
	 */
	alt?: string;
	/**
	 * Who this is. Gives one or two initials for the fallback and a colour that
	 * is always the same for the same name.
	 */
	name?: string;
	/** Diameter: 28, 36 or 64px. */
	size?: AvatarSize;
	/** Fully round, or a rounded square. */
	shape?: AvatarShape;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { accessibleName, avatarToneClass, initialsOf, resolveAvatarStatus } from "./avatar-core.js";

defineOptions({ name: "Avatar", inheritAttrs: false });

const {
	src,
	alt,
	name,
	size = "md",
	shape = "circle",
	class: className,
} = defineProps<AvatarProps>();

const attrs = useAttrs();

const SIZE_CLASSES: Record<AvatarSize, string> = {
	sm: "size-7 text-[0.65rem]",
	md: "size-9 text-xs",
	lg: "size-16 text-lg",
};

const SHAPE_CLASSES: Record<AvatarShape, string> = {
	circle: "rounded-full",
	square: "rounded-lg",
};

// The last source that loaded and the last that failed, not a status flag: a
// new `src` is "loading" again with nothing to reset, and the server render
// and the first client render agree.
const loadedSrc = ref<string | null>(null);
const failedSrc = ref<string | null>(null);
const img = useTemplateRef<HTMLImageElement>("img");

const status = computed(() => resolveAvatarStatus(src, loadedSrc.value, failedSrc.value));
const label = computed(() => accessibleName(alt, name));
const initials = computed(() => initialsOf(name));

// An image that finished before this component hydrated has already fired its
// load or error event, so the handlers in the template never hear about it.
// Ask the element once it exists, and again whenever `src` changes.
function settle() {
	const el = img.value;
	if (!el || !src || !el.complete) return;
	if (el.naturalWidth > 0) loadedSrc.value = src;
	else failedSrc.value = src;
}
onMounted(settle);
watch(() => src, settle, { flush: "post" });

const classes = computed(() =>
	cn(
		"relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold select-none",
		SIZE_CLASSES[size],
		SHAPE_CLASSES[shape],
		status.value === "fallback" ? avatarToneClass(name) : "bg-muted text-muted-foreground",
		className
	)
);

function onLoad() {
	loadedSrc.value = src ?? null;
}

function onError() {
	failedSrc.value = src ?? null;
}
</script>

<template>
	<span
		v-bind="attrs"
		:class="classes"
		:role="label ? 'img' : (attrs.role as string | undefined)"
		:aria-label="label ?? (attrs['aria-label'] as string | undefined)"
		:aria-hidden="label ? undefined : 'true'"
		:data-size="size"
		:data-shape="shape"
		:data-status="status"
	>
		<img
			v-if="src && status !== 'fallback'"
			ref="img"
			:src="src"
			alt=""
			decoding="async"
			draggable="false"
			:class="
				cn(
					'absolute inset-0 size-full object-cover motion-safe:transition-opacity motion-safe:duration-200',
					status === 'loaded' ? 'opacity-100' : 'opacity-0'
				)
			"
			@load="onLoad"
			@error="onError"
		/>
		<span
			v-if="status === 'loading'"
			data-slot="skeleton"
			aria-hidden="true"
			class="bg-foreground/10 absolute inset-0 motion-safe:animate-pulse"
		></span>
		<template v-else-if="status === 'fallback'">
			<span v-if="initials" data-slot="initials" aria-hidden="true">{{ initials }}</span>
			<svg
				v-else
				data-slot="silhouette"
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="currentColor"
				class="size-[60%]"
			>
				<circle cx="12" cy="8.5" r="4" />
				<path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7z" />
			</svg>
		</template>
	</span>
</template>
