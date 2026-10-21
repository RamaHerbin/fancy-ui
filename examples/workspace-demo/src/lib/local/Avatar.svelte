<script lang="ts" module>
	export type AvatarSize = "sm" | "md" | "lg";
</script>

<script lang="ts">
	// Initials in a circle. With a `name` it is an image the screen reader
	// announces; without one it is decoration beside text that already says
	// who it is.
	let {
		initials,
		name,
		size = "md",
		class: className = "",
	}: { initials: string; name?: string; size?: AvatarSize; class?: string } = $props();

	const letters = $derived(initials.trim().slice(0, 2).toUpperCase());
	const sizes: Record<AvatarSize, string> = {
		sm: "size-7 text-[0.65rem]",
		md: "size-9 text-xs",
		lg: "size-16 text-lg",
	};
</script>

<span
	class="bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none {sizes[
		size
	]} {className}"
	data-size={size}
	role={name ? "img" : undefined}
	aria-label={name || undefined}
	aria-hidden={name ? undefined : "true"}
>
	{letters}
</span>
