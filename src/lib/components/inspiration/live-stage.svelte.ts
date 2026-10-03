/**
 * The single live stage of the Inspiration grid: at most one card runs its
 * demo at a time. A card claims the stage on hover/focus (or Play); claiming
 * hands it over from whichever card held it, whose demo then unmounts.
 *
 * Module-level `$state`, so every card on the page reads the same slot.
 */

let active = $state<string | null>(null);

export const liveStage = {
	/** Slug of the card whose demo may run, or null. */
	get active(): string | null {
		return active;
	},
	claim(slug: string): void {
		active = slug;
	},
	/** Releases only if `slug` still holds the stage — a late release never steals another card's. */
	release(slug: string): void {
		if (active === slug) active = null;
	},
};
