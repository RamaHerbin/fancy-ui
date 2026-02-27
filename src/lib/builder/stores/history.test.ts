import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushSync } from "svelte";
import { HistoryManager, type HistoryOperation } from "./history.svelte.js";
import type { PageDocument } from "../types/index.js";

function makePage(title: string, bodyIds: string[] = []): PageDocument {
	return {
		version: 1,
		meta: {
			title,
			slug: "test",
			status: "draft",
			createdAt: "2024-01-01",
			updatedAt: "2024-01-01",
		},
		body: bodyIds.map((id) => ({ id, type: "_text", props: { content: id } })),
	};
}

const STRUCTURE: HistoryOperation = { type: "structure" };
function propOp(blockId: string, key: string): HistoryOperation {
	return { type: "prop", blockId, key };
}
function metaOp(key: string): HistoryOperation {
	return { type: "meta", key };
}

describe("HistoryManager", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("undo / redo basics", () => {
		it("returns null when nothing to undo", () => {
			const h = new HistoryManager();
			expect(h.undo(makePage("current"), null)).toBeNull();
		});

		it("returns null when nothing to redo", () => {
			const h = new HistoryManager();
			expect(h.redo(makePage("current"), null)).toBeNull();
		});

		it("undoes a structure operation", () => {
			const h = new HistoryManager();
			const before = makePage("before", ["a"]);
			h.push(before, "a", STRUCTURE);

			const after = makePage("after", ["a", "b"]);
			const snapshot = h.undo(after, "b");

			expect(snapshot).not.toBeNull();
			expect(snapshot!.page.meta.title).toBe("before");
			expect(snapshot!.page.body).toHaveLength(1);
			expect(snapshot!.selectedBlockId).toBe("a");
		});

		it("redoes after undo", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);

			const v2 = makePage("v2");
			const undone = h.undo(v2, null);
			expect(undone!.page.meta.title).toBe("v1");

			// Now redo — should restore v2
			const redone = h.redo(undone!.page, null);
			expect(redone!.page.meta.title).toBe("v2");
		});

		it("clears redo stack on new push", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);
			h.push(makePage("v2"), null, STRUCTURE);

			// Undo once
			h.undo(makePage("v3"), null);

			// New action — should clear redo
			h.push(makePage("v3-alt"), null, STRUCTURE);
			expect(h.redo(makePage("v4"), null)).toBeNull();
		});

		it("handles multiple undo/redo in sequence", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);
			h.push(makePage("v2"), null, STRUCTURE);
			h.push(makePage("v3"), null, STRUCTURE);

			const current = makePage("v4");

			const s3 = h.undo(current, null);
			expect(s3!.page.meta.title).toBe("v3");

			const s2 = h.undo(s3!.page, null);
			expect(s2!.page.meta.title).toBe("v2");

			const s1 = h.undo(s2!.page, null);
			expect(s1!.page.meta.title).toBe("v1");

			expect(h.undo(s1!.page, null)).toBeNull();

			// Redo back
			const r2 = h.redo(s1!.page, null);
			expect(r2!.page.meta.title).toBe("v2");

			const r3 = h.redo(r2!.page, null);
			expect(r3!.page.meta.title).toBe("v3");

			const r4 = h.redo(r3!.page, null);
			expect(r4!.page.meta.title).toBe("v4");

			expect(h.redo(r4!.page, null)).toBeNull();
		});

		it("preserves selectedBlockId through undo/redo", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), "block-A", STRUCTURE);

			const snapshot = h.undo(makePage("v2"), "block-B");
			expect(snapshot!.selectedBlockId).toBe("block-A");

			const redone = h.redo(snapshot!.page, "block-A");
			expect(redone!.selectedBlockId).toBe("block-B");
		});
	});

	describe("snapshots are independent copies", () => {
		it("mutating original page does not affect stored snapshot", () => {
			const h = new HistoryManager();
			const page = makePage("original", ["a"]);
			h.push(page, null, STRUCTURE);

			// Mutate the page after push
			page.meta.title = "mutated";
			page.body.push({ id: "b", type: "_text", props: {} });

			const snapshot = h.undo(makePage("current"), null);
			expect(snapshot!.page.meta.title).toBe("original");
			expect(snapshot!.page.body).toHaveLength(1);
		});
	});

	describe("coalescing", () => {
		it("coalesces rapid prop updates on the same target", () => {
			const h = new HistoryManager();
			const op = propOp("block1", "color");

			h.push(makePage("v1"), null, op);
			h.push(makePage("v2"), null, op);
			h.push(makePage("v3"), null, op);

			// Flush the coalesce timer
			vi.advanceTimersByTime(500);

			// Should have only ONE undo entry (the original v1 snapshot)
			const snapshot = h.undo(makePage("v4"), null);
			expect(snapshot!.page.meta.title).toBe("v1");
			expect(h.undo(makePage("x"), null)).toBeNull();
		});

		it("coalesces rapid meta updates on the same key", () => {
			const h = new HistoryManager();
			const op = metaOp("title");

			h.push(makePage("before-typing"), null, op);
			h.push(makePage("b"), null, op);
			h.push(makePage("be"), null, op);
			h.push(makePage("bef"), null, op);

			vi.advanceTimersByTime(500);

			const snapshot = h.undo(makePage("befo"), null);
			expect(snapshot!.page.meta.title).toBe("before-typing");
			expect(h.undo(makePage("x"), null)).toBeNull();
		});

		it("does not coalesce different prop targets", () => {
			const h = new HistoryManager();

			h.push(makePage("v1"), null, propOp("block1", "color"));
			vi.advanceTimersByTime(500);

			h.push(makePage("v2"), null, propOp("block2", "color"));
			vi.advanceTimersByTime(500);

			// Two separate undo entries
			const s1 = h.undo(makePage("v3"), null);
			expect(s1!.page.meta.title).toBe("v2");

			const s2 = h.undo(s1!.page, null);
			expect(s2!.page.meta.title).toBe("v1");
		});

		it("does not coalesce different prop keys on same block", () => {
			const h = new HistoryManager();

			h.push(makePage("v1"), null, propOp("block1", "color"));
			vi.advanceTimersByTime(500);

			h.push(makePage("v2"), null, propOp("block1", "size"));
			vi.advanceTimersByTime(500);

			const s1 = h.undo(makePage("v3"), null);
			expect(s1!.page.meta.title).toBe("v2");

			const s2 = h.undo(s1!.page, null);
			expect(s2!.page.meta.title).toBe("v1");
		});

		it("commits pending on structure push", () => {
			const h = new HistoryManager();

			// Start a coalescable prop edit
			h.push(makePage("prop-start"), null, propOp("b1", "color"));
			// Structure push should commit pending first
			h.push(makePage("after-prop"), null, STRUCTURE);

			// Should have 2 undo entries: prop-start and after-prop
			const s1 = h.undo(makePage("current"), null);
			expect(s1!.page.meta.title).toBe("after-prop");

			const s2 = h.undo(s1!.page, null);
			expect(s2!.page.meta.title).toBe("prop-start");
		});

		it("commits pending on undo", () => {
			const h = new HistoryManager();

			h.push(makePage("typing-start"), null, metaOp("title"));
			// Undo without waiting for timer — should commit pending first
			const snapshot = h.undo(makePage("typing-end"), null);
			expect(snapshot!.page.meta.title).toBe("typing-start");
		});

		it("commits pending on redo", () => {
			const h = new HistoryManager();

			// Set up: one entry, then undo to get redo available
			h.push(makePage("v1"), null, STRUCTURE);
			h.undo(makePage("v2"), null);

			// Now push a pending prop edit, then redo
			h.push(makePage("prop-start"), null, propOp("b1", "x"));

			// Redo should commit pending, then redo
			// But redo stack was cleared by the new push, so redo returns null
			expect(h.redo(makePage("current"), null)).toBeNull();
		});
	});

	describe("max history", () => {
		it("caps undo stack at 50 entries", () => {
			const h = new HistoryManager();

			for (let i = 0; i < 60; i++) {
				h.push(makePage(`v${i}`), null, STRUCTURE);
			}

			// Should only be able to undo 50 times
			let count = 0;
			let current = makePage("v60");
			while (true) {
				const snapshot = h.undo(current, null);
				if (!snapshot) break;
				current = snapshot.page;
				count++;
			}

			expect(count).toBe(50);
			// Oldest entry should be v10 (v0-v9 were evicted)
			expect(current.meta.title).toBe("v10");
		});
	});

	describe("canUndo / canRedo", () => {
		it("starts with canUndo=false and canRedo=false", () => {
			const h = new HistoryManager();
			flushSync();
			expect(h.canUndo).toBe(false);
			expect(h.canRedo).toBe(false);
		});

		it("canUndo becomes true after push", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);
			flushSync();
			expect(h.canUndo).toBe(true);
		});

		it("canUndo is true with pending (before timer)", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, propOp("b1", "color"));
			flushSync();
			// Pending exists, so canUndo should be true even before timer fires
			expect(h.canUndo).toBe(true);
		});

		it("canRedo becomes true after undo", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);
			h.undo(makePage("v2"), null);
			flushSync();
			expect(h.canRedo).toBe(true);
		});

		it("canRedo becomes false after new push", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);
			h.undo(makePage("v2"), null);
			h.push(makePage("v3"), null, STRUCTURE);
			flushSync();
			expect(h.canRedo).toBe(false);
		});

		it("canUndo becomes false after undoing everything", () => {
			const h = new HistoryManager();
			h.push(makePage("v1"), null, STRUCTURE);
			h.undo(makePage("v2"), null);
			flushSync();
			expect(h.canUndo).toBe(false);
		});
	});
});
