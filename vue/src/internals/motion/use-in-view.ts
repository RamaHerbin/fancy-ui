import { computed, onScopeDispose, ref, watch, type Ref, type WatchSource } from "vue";
import { inView, type InViewOptions } from "./in-view.js";

export interface UseInViewOptions extends Omit<InViewOptions, "onChange"> {
	onChange?: InViewOptions["onChange"];
	/** Skip observing entirely while false. Default true. */
	enabled?: boolean;
}

/**
 * `useInView(el, () => opts)` — the composable binding over the framework-free
 * `inView` core. Attaches from a `flush: 'post'` watcher on the element (C-1):
 * the watch source list mirrors the core's own `update()` split — `threshold`,
 * `rootMargin` and `root` are the constructor arguments that force a new
 * observer, while `once` and `onChange` are read fresh on every fire through
 * `currentOptions()` and never trigger a rebuild on their own.
 *
 * Returns a readonly ref, `false` on the server and through the hydration
 * render — the core only ever attaches from this post-flush watcher, which
 * never runs off-browser (C-7).
 */
export function useInView(
	el: WatchSource<Element | null>,
	options?: () => UseInViewOptions
): Readonly<Ref<boolean>> {
	const visible = ref(false);

	let handle: ReturnType<typeof inView>;
	let attachedNode: Element | null = null;
	// The composable's own copy of the core's `firedOnce`. The core keeps that
	// flag in the closure of ONE action instance, so it dies with the instance;
	// `enabled: false` tears the instance down and `enabled: true` would build a
	// fresh one that knows nothing about the earlier fire, handing a
	// `once: true` consumer a second `onChange(true)`. This flag outlives the
	// enable/disable cycle and dies only with the observed node (a new node is a
	// new action instance, which is exactly the Svelte action's lifetime) or
	// with the scope.
	let firedOnce = false;

	function currentOptions(): UseInViewOptions {
		return options?.() ?? {};
	}

	function toCoreOptions(): InViewOptions {
		const o = currentOptions();
		return {
			once: o.once,
			threshold: o.threshold,
			rootMargin: o.rootMargin,
			root: o.root,
			onChange: (inViewNow, entry) => {
				visible.value = inViewNow;
				currentOptions().onChange?.(inViewNow, entry);
				// Mirrors the core's own post-callback check, in the same order.
				if (inViewNow && (currentOptions().once ?? true)) firedOnce = true;
			},
		};
	}

	function attach(target: Element) {
		// A spent `once: true` instance never observes again, exactly as the
		// core's `build()` refuses to rebuild after `firedOnce`.
		if (firedOnce) return;
		handle = inView(target, toCoreOptions());
	}

	function destroy() {
		handle?.destroy?.();
		handle = undefined;
	}

	watch(
		[
			el,
			() => currentOptions().enabled,
			() => JSON.stringify(currentOptions().threshold ?? 0.1),
			() => currentOptions().rootMargin,
			() => currentOptions().root,
		],
		([node]) => {
			const target = (node as Element | null) ?? null;
			const enabled = currentOptions().enabled ?? true;

			// The observed node itself changed: the old observer belongs to a
			// node that may no longer exist, so it is always torn down and, if
			// there is a new enabled target, a fresh one is built. A new node is
			// a new action instance, so the spent-once flag resets with it.
			if (target !== attachedNode) {
				destroy();
				attachedNode = target;
				firedOnce = false;
				if (target && enabled) attach(target);
				return;
			}

			if (!enabled) {
				destroy();
				return;
			}

			// Same node, just turned back on (or never attached because it
			// started disabled): build fresh rather than update() against a
			// handle that does not exist.
			if (!handle) {
				if (target) attach(target);
				return;
			}

			// Same node, still enabled: let the core's own update() decide
			// whether threshold/rootMargin/root actually changed enough to
			// rebuild — it also keeps a `once: true` observer that already
			// fired from ever being rebuilt (see in-view.ts).
			handle.update?.(toCoreOptions());
		},
		{ flush: "post" }
	);

	onScopeDispose(destroy);

	// A genuine readonly view, symmetric with `useMediaQuery` — a cast alone
	// would leave the returned ref writable from the outside.
	return computed(() => visible.value);
}
