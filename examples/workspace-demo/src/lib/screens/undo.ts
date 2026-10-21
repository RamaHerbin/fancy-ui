// The demo's one undo pattern, shared by API keys and notifications: the
// screen changes at once, a toast with Undo counts down, and the call is only
// made once that toast closes for any reason but Undo. The countdown is the
// toast's own: it pauses while the pointer or focus is on the toast (and
// resumes with the time it had left), the bar drains with it, and it sits
// still under reduced motion.
import { dismissToast, toast } from "fancy-ui-svelte";
import { strings } from "$lib/strings.js";

/** How long a change can still be taken back, in milliseconds. */
export const UNDO_WINDOW_MS = 6000;

export interface Undoable {
	title: string;
	description?: string;
	/** Label of the action; defaults to "Undo". */
	undoLabel?: string;
	/** Puts the screen back the way it was. The toast closes on its own. */
	onUndo: () => void;
	/**
	 * Sends the change. Runs once, when the toast times out, is dismissed
	 * (including by the screen when it goes away) or is pushed out of a full
	 * stack by newer toasts: none of those is an undo.
	 */
	onCommit: () => void;
}

/** Shows the undo toast and returns its id, for `dismissToast`. */
export function undoable(options: Undoable): string {
	const id = toast({
		title: options.title,
		description: options.description,
		duration: UNDO_WINDOW_MS,
		progress: true,
		action: {
			label: options.undoLabel ?? strings.actions.undo,
			onClick: () => {
				options.onUndo();
				dismissToast(id);
			},
		},
		onClose: (reason) => {
			if (reason !== "action") options.onCommit();
		},
	});
	return id;
}
