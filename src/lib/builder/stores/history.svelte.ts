/**
 * Undo/Redo History Manager
 *
 * Snapshot-based history with coalescing for high-frequency prop/meta updates.
 * Structural mutations (add/remove/move) commit immediately.
 * Prop and meta mutations coalesce within a 500ms window on the same target.
 *
 * Max 50 entries, in-memory only.
 */

import type { PageDocument } from '../types/index.js';

const MAX_HISTORY = 50;
const COALESCE_DELAY = 500;

export type HistoryOperation =
	| { type: 'structure' }
	| { type: 'prop'; blockId: string; key: string }
	| { type: 'meta'; key: string };

interface Snapshot {
	page: PageDocument;
	selectedBlockId: string | null;
}

function cloneSnapshot(page: PageDocument, selectedBlockId: string | null): Snapshot {
	return {
		page: $state.snapshot(page) as PageDocument,
		selectedBlockId
	};
}

function sameTarget(a: HistoryOperation, b: HistoryOperation): boolean {
	if (a.type !== b.type) return false;
	if (a.type === 'prop' && b.type === 'prop') {
		return a.blockId === b.blockId && a.key === b.key;
	}
	if (a.type === 'meta' && b.type === 'meta') {
		return a.key === b.key;
	}
	return false;
}

export class HistoryManager {
	private undoStack: Snapshot[] = [];
	private redoStack: Snapshot[] = [];

	// Pending coalesced snapshot (not yet committed)
	private pending: { snapshot: Snapshot; operation: HistoryOperation } | null = null;
	private timer: ReturnType<typeof setTimeout> | null = null;

	canUndo: boolean = $derived(this.undoStack.length > 0 || this.pending !== null);
	canRedo: boolean = $derived(this.redoStack.length > 0);

	/**
	 * Record a snapshot BEFORE a mutation.
	 * Call this with the current page state before modifying it.
	 */
	push(page: PageDocument, selectedBlockId: string | null, operation: HistoryOperation) {
		if (operation.type === 'structure') {
			this.commitPending();
			this.commitSnapshot(cloneSnapshot(page, selectedBlockId));
			return;
		}

		// Coalescable operation (prop or meta)
		if (this.pending && sameTarget(this.pending.operation, operation)) {
			// Same target — keep the ORIGINAL snapshot, just restart the timer
			this.clearTimer();
			this.startTimer();
		} else {
			// Different target — commit any pending, start new
			this.commitPending();
			this.pending = {
				snapshot: cloneSnapshot(page, selectedBlockId),
				operation
			};
			this.startTimer();
		}

		// Any new action clears the redo stack
		this.redoStack.length = 0;
	}

	undo(currentPage: PageDocument, currentSelectedBlockId: string | null): Snapshot | null {
		this.commitPending();

		if (this.undoStack.length === 0) return null;

		const snapshot = this.undoStack.pop()!;
		this.redoStack.push(cloneSnapshot(currentPage, currentSelectedBlockId));

		return snapshot;
	}

	redo(currentPage: PageDocument, currentSelectedBlockId: string | null): Snapshot | null {
		this.commitPending();

		if (this.redoStack.length === 0) return null;

		const snapshot = this.redoStack.pop()!;
		this.undoStack.push(cloneSnapshot(currentPage, currentSelectedBlockId));

		return snapshot;
	}

	private commitPending() {
		if (!this.pending) return;
		this.clearTimer();
		this.commitSnapshot(this.pending.snapshot);
		this.pending = null;
	}

	private commitSnapshot(snapshot: Snapshot) {
		this.undoStack.push(snapshot);
		if (this.undoStack.length > MAX_HISTORY) {
			this.undoStack.shift();
		}
	}

	private startTimer() {
		this.timer = setTimeout(() => {
			this.commitPending();
		}, COALESCE_DELAY);
	}

	private clearTimer() {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
