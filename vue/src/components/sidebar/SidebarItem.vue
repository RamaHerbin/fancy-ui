<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface SidebarItemProps {
	/** Renders an `<a>` when set; a `<button type="button">` otherwise. */
	href?: string;
	/**
	 * Marks this as the current item: `aria-current="page"` plus the
	 * accent left bar — current is never conveyed by colour alone.
	 */
	current?: boolean;
	/** A count or short flag, e.g. `4` — rendered as a pill and folded into the accessible name. */
	badge?: string | number;
	/**
	 * What the badge means, read alongside its value in the accessible
	 * name (`"Inbox, 4 unread"`). Defaults to just the badge value if not given.
	 */
	badgeLabel?: string;
	/** Disables both the click and keyboard-activation paths. */
	disabled?: boolean;
	/** Native click handler, for the `<button>` branch. Never called while `disabled`. */
	onclick?: (event: MouseEvent) => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the select cue through the sound controller. Off by default;
	 * only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, inject, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { SIDEBAR_KEY, type SidebarContext } from "./types.js";
import { sound as soundFx } from "../../sound/sound.js";

defineOptions({ name: "SidebarItem", inheritAttrs: false });

const {
	href,
	current = false,
	badge,
	badgeLabel,
	disabled = false,
	onclick,
	class: className,
	sound = false,
} = defineProps<SidebarItemProps>();

defineSlots<{
	/** A decorative glyph or icon, shown even when the sidebar is collapsed. */
	icon?(): unknown;
	/** The item's label. Moves to `sr-only` text while the sidebar is collapsed — never removed. */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLAnchorElement | HTMLButtonElement>("el");
defineExpose({ ref: el });

const sidebar = inject<SidebarContext | undefined>(SIDEBAR_KEY, undefined);
const collapsed = computed(() => sidebar?.collapsed ?? false);

const hasBadge = computed(() => badge !== undefined && badge !== null && badge !== "");

const classes = computed(() =>
	cn(
		"ft-sidebar-item flex w-full items-center gap-2.5 rounded-[6px] px-2 py-[7px] text-[13px] transition-colors",
		"focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
		collapsed.value && "justify-center",
		current
			? "ft-sidebar-item--current bg-accent text-accent-foreground font-medium"
			: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
		disabled && "pointer-events-none opacity-50",
		className
	)
);

// The native `disabled` attribute on the `<button>` branch already blocks
// real pointer/keyboard input, and the anchor branch strips `href`
// entirely below — but a synthetic click (a test's `fireEvent.click`,
// some assistive tech) reaches this handler regardless of either, so the
// guard is what actually stops the callback in both cases.
function handleClick(event: MouseEvent) {
	if (disabled) {
		event.preventDefault();
		return;
	}
	if (sound && !current) soundFx.play("select");
	onclick?.(event);
}
</script>

<template>
	<li class="ft-sidebar-item-wrapper w-full list-none">
		<a
			v-if="href"
			ref="el"
			:href="disabled ? undefined : href"
			:aria-current="current ? 'page' : undefined"
			:aria-disabled="disabled ? 'true' : undefined"
			:tabindex="disabled ? -1 : undefined"
			:class="classes"
			@click="handleClick"
		>
			<span v-if="$slots.icon" class="ft-sidebar-item-icon shrink-0" aria-hidden="true">
				<slot name="icon" />
			</span>
			<span :class="cn('min-w-0 flex-1 truncate text-left', collapsed && 'sr-only')">
				<slot />
			</span>
			<span v-if="hasBadge" :class="cn('ft-sidebar-item-badge shrink-0', collapsed && 'sr-only')">
				{{ badge }}
				<span v-if="badgeLabel" class="sr-only">{{ " " }}{{ badgeLabel }}</span>
			</span>
		</a>
		<button
			v-else
			ref="el"
			type="button"
			:disabled="disabled"
			:aria-current="current ? 'page' : undefined"
			:class="classes"
			@click="handleClick"
		>
			<span v-if="$slots.icon" class="ft-sidebar-item-icon shrink-0" aria-hidden="true">
				<slot name="icon" />
			</span>
			<span :class="cn('min-w-0 flex-1 truncate text-left', collapsed && 'sr-only')">
				<slot />
			</span>
			<span v-if="hasBadge" :class="cn('ft-sidebar-item-badge shrink-0', collapsed && 'sr-only')">
				{{ badge }}
				<span v-if="badgeLabel" class="sr-only">{{ " " }}{{ badgeLabel }}</span>
			</span>
		</button>
	</li>
</template>

<style scoped>
/*
 * Declared here too, not just on Sidebar's root: `SidebarItem` is meant to
 * be usable on its own DOM subtree, and relying on inheritance alone
 * would leave the accent bar and badge fill missing wherever it doesn't
 * happen to render as a Sidebar descendant. Same shape as
 * `Autocomplete`/`Combobox`/`TimePicker`'s `--ft-field-accent` and
 * `Button`'s `--ft-btn-accent` — every one of those declares its own copy
 * of the same formula rather than trusting an ancestor. This reads
 * `--ft-accent`, never redeclares it, so a consumer retinting the whole
 * tree from higher up still reaches this. Declared on the item's own
 * root class, not the `--current` modifier, so the badge fill below —
 * which needs it regardless of `current` — inherits it too.
 */
.ft-sidebar-item {
	--ft-nav-accent: var(
		--ft-accent,
		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
	);
	/* The accent bar below is an absolutely-positioned pseudo, which needs a
	   containing block. A flex item taking `position: relative` changes no
	   layout. */
	position: relative;
}

/*
 * The accent bar, character-for-character the declaration that used to sit
 * on `.ft-sidebar-item--current` itself — same inset shadow, same inherited
 * radius, so the resting look is unchanged. It lives one layer down for two
 * reasons. It can now be transitioned without transitioning the focus ring,
 * which shares the `box-shadow` property and must never animate. And it
 * frees the host's own `box-shadow`, which Tailwind's `focus-visible:ring-2`
 * compiles to: unlayered scoped CSS beats `@layer utilities` regardless of
 * specificity, so until now the current item's own accent bar was
 * suppressing its focus ring entirely.
 */
.ft-sidebar-item::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	pointer-events: none;
	box-shadow: inset 2px 0 0 var(--ft-nav-accent);
	opacity: 0;
}

.ft-sidebar-item--current::before {
	opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
	/* 150ms = tokens.DURATIONS.fast, cubic-bezier(0.4, 0, 0.2, 1) = tokens.EASINGS.inout */
	.ft-sidebar-item::before {
		transition:
			opacity var(--ft-sidebar-signal-duration, var(--ft-duration-fast, 150ms))
				var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1)),
			transform var(--ft-sidebar-signal-duration, var(--ft-duration-fast, 150ms))
				var(--ft-ease-inout, cubic-bezier(0.4, 0, 0.2, 1));
		transform: scaleY(0.4);
		transform-origin: center;
	}

	.ft-sidebar-item--current::before {
		transform: scaleY(1);
	}
}

.ft-sidebar-item-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.1rem;
	border-radius: 999px;
	padding: 1px 7px;
	font-size: 10px;
	font-weight: 600;
	line-height: 1.4;
	background: var(--ft-nav-accent);
	color: var(--ft-accent-foreground, oklch(1 0 0));
}
</style>
