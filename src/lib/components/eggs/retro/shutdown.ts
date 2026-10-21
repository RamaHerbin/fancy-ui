import { tick } from "svelte";
import type { EggContext } from "../types.js";

export interface ShutdownCurtain {
	cover(): Promise<void>;
	reveal(): Promise<void>;
}

/**
 * Cover the page, swap the skin underneath, then lift the curtain. Kept apart
 * from the component so the order can be unit-tested without a canvas.
 * `alive()` turns false when the overlay was dismissed (Escape) mid-cover: the
 * user backed out, so the skin stays.
 */
export async function runShutdown(
	dm: ShutdownCurtain,
	ctx: Pick<EggContext, "found" | "dismiss">,
	setSkin: (skin: "standard") => void,
	alive: () => boolean = () => true,
	settle: () => Promise<void> = tick
): Promise<void> {
	await dm.cover();
	if (!alive()) return;
	setSkin("standard");
	// Let the standard chrome render under the curtain before revealing it.
	await settle();
	await dm.reveal();
	ctx.found();
	ctx.dismiss();
}
