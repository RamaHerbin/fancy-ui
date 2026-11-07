import { onScopeDispose, watch, type Ref } from "vue";
import { useInView } from "./use-in-view.js";

const ATTR = "data-ft-offscreen";

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
			target.value?.toggleAttribute(ATTR, !visible);
		},
	}));
	// The marker is only meaningful while the element is observed: an element
	// that stops being the target (or whose scope ends while it is offscreen)
	// must not keep pausing its loops for good — the observed node may be a
	// shared parent (Meteors), where a stale marker would freeze its siblings.
	watch(target, (_el, previous) => previous?.removeAttribute(ATTR));
	onScopeDispose(() => target.value?.removeAttribute(ATTR));
}
