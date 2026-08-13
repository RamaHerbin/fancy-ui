import type { Snippet } from "svelte";

/**
 * The contract for `DialogSurface`, the modal-surface primitive `Dialog`
 * and `AlertDialog` both render through: portal, backdrop scrim, scroll
 * lock, focus trap, and Escape/outside-click dismissal.
 *
 * This is a "compound" in the sense that two public components share one
 * internal implementation, not in the `RadioGroup`/`RadioGroupItem` sense
 * of a root publishing Svelte context to children a caller composes by
 * hand. `Dialog` and `AlertDialog` diverge enough in public API — a
 * free-form footer versus a fixed confirm/cancel pair, `dismissible` versus
 * a role-appropriate fixed default, `role="dialog"` versus
 * `"alertdialog"` — that neither should be built as a thin variant of the
 * other. What they actually share is this plumbing, so that is what is
 * factored out, as plain props passed straight from each root component to
 * `DialogSurface`. There is no arbitrary caller-authored markup in between
 * for a Svelte context to reach across — both call sites are this folder's
 * own two root components — so passing props directly says the same thing
 * a context would, with one less indirection.
 *
 * Not exported from `index.ts`: `DialogSurface` is an implementation
 * detail, not part of the package's public surface.
 */
export interface DialogSurfaceProps {
	/** Whether the surface is mounted and interactive. */
	open: boolean;
	/** Forwarded verbatim to the panel's `role`. */
	role: "dialog" | "alertdialog";
	/** Id of the element that labels the surface, or undefined when there is none to point at. */
	titleId?: string;
	/** Id of the element that describes the surface, or undefined when there is none to point at. */
	descriptionId?: string;
	/** Whether Escape dismisses. Required, not defaulted — every caller must make this call explicitly. */
	escape: boolean;
	/** Whether an outside pointerdown dismisses. Required for the same reason as `escape`. */
	outsideClick: boolean;
	/** Called for every dismiss trigger this surface owns (Escape, outside click). */
	onDismiss: () => void;
	/** Element to focus once the trap activates. Defaults to the first focusable descendant when omitted. */
	initialFocus?: HTMLElement | null;
	/**
	 * Where to send focus back on close if the element that had it before
	 * the surface opened is no longer in the document by then (removed by a
	 * re-render, a list row disappearing, a trigger inside a reordering
	 * `{#each}`). Forwarded to `focusTrap`'s `fallbackFocus` — see that
	 * file's doc comment for the full fallback chain. Both `Dialog` and
	 * `AlertDialog` pass their own trigger wrapper here.
	 */
	fallbackFocus?: () => HTMLElement | null | undefined;
	/** Elements an outside pointerdown must ignore — typically the trigger that opened this surface. */
	exclude?: () => (HTMLElement | null)[];
	/** Extra classes merged onto the panel element. */
	panelClass?: string;
	/** The panel's content. */
	children?: Snippet;
	/** Bindable reference to the panel element. */
	ref?: HTMLDivElement | null;
}
