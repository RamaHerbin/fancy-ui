import { type Ref } from "vue";
import { useInView } from "./use-in-view.js";

/**
 * Composable binding for the offscreen-pause primitive (see
 * `offscreen-pause.ts`): sets `data-ft-offscreen` on the target while it is out
 * of view so a stylesheet can pause its CSS loop. Call it from `setup()` with
 * the root element ref.
 */
export function useOffscreenPause(target: Readonly<Ref<Element | null>>): void {
	useInView(target, () => ({
		once: false,
		threshold: 0,
		rootMargin: "256px",
		onChange: (visible) => {
			target.value?.toggleAttribute("data-ft-offscreen", !visible);
		},
	}));
}
