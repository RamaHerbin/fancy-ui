// Svelte action that moves a DOM node to a different target in the document
// (defaults to <body>) and removes it again when the node is destroyed.
//
// Usage:
//   <div use:portal>...</div>
//   <div use:portal={"#modal-root"}>...</div>
//   <div use:portal={someElement}>...</div>

interface PortalAction {
	/** Re-run when the `target` argument changes. */
	update(target?: HTMLElement | string): void;
	/** Remove the node from the DOM. */
	destroy(): void;
}

/**
 * Resolves a portal target argument to an actual element.
 * Falls back to `document.body` when a string selector matches nothing.
 */
function resolveTarget(target: HTMLElement | string | undefined): HTMLElement {
	if (target instanceof HTMLElement) {
		return target;
	}

	if (typeof target === "string") {
		const match = document.querySelector<HTMLElement>(target);
		if (match) {
			return match;
		}
	}

	return document.body;
}

/**
 * Moves `node` into `target` (defaults to `document.body`) for as long as the
 * action is mounted, then removes `node` from the DOM on destroy.
 *
 * SSR-safe: does nothing when `document` is unavailable.
 */
export function portal(node: HTMLElement, target?: HTMLElement | string): PortalAction {
	function mount(nextTarget: HTMLElement | string | undefined): void {
		if (typeof document === "undefined") {
			return;
		}
		resolveTarget(nextTarget).appendChild(node);
	}

	mount(target);

	return {
		update(nextTarget) {
			mount(nextTarget);
		},
		destroy() {
			if (typeof document === "undefined") {
				return;
			}
			node.remove();
		},
	};
}
