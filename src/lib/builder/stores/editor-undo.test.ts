/**
 * EditorState undo/redo integration tests.
 *
 * These mirror the PR test plan — each scenario exercises the full
 * EditorState → HistoryManager → undo/redo pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushSync } from "svelte";
import { EditorState } from "./editor.svelte.js";
import type { PageDocument, BlockNode } from "../types/index.js";

function makePage(overrides?: Partial<PageDocument>): PageDocument {
  return {
    version: 1,
    meta: {
      title: "Test Page",
      slug: "test",
      status: "draft",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      ...overrides?.meta,
    },
    body: overrides?.body ?? [],
  } as PageDocument;
}

function makeBlock(
  id: string,
  type = "_text",
  props: Record<string, unknown> = {},
): BlockNode {
  return { id, type, props: { content: id, ...props } };
}

function bodyIds(editor: EditorState): string[] {
  return editor.page.body.map((b) => b.id);
}

describe("EditorState undo/redo integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("meta updates (title field)", () => {
    it("reverts title to before typing started (coalesced, one undo step)", () => {
      const editor = new EditorState(makePage());
      expect(editor.page.meta.title).toBe("Test Page");

      // Simulate typing keystrokes — all same meta key
      editor.updatePageMeta("title", "T");
      editor.updatePageMeta("title", "Te");
      editor.updatePageMeta("title", "Tes");
      editor.updatePageMeta("title", "Test");
      editor.updatePageMeta("title", "Test ");
      editor.updatePageMeta("title", "Test N");
      editor.updatePageMeta("title", "Test Ne");
      editor.updatePageMeta("title", "Test New");

      // Flush coalesce timer
      vi.advanceTimersByTime(500);

      expect(editor.page.meta.title).toBe("Test New");

      // Single undo should revert ALL keystrokes at once
      editor.undo();
      expect(editor.page.meta.title).toBe("Test Page");
    });
  });

  describe("prop updates", () => {
    it("edit prop, edit different prop, undo twice — both revert separately", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("b1"), makeBlock("b2")] }),
      );

      // Edit first block's color
      editor.updateBlockProp("b1", "color", "red");
      vi.advanceTimersByTime(500);

      // Edit second block's content
      editor.updateBlockProp("b2", "content", "hello");
      vi.advanceTimersByTime(500);

      expect(editor.page.body[0].props.color).toBe("red");
      expect(editor.page.body[1].props.content).toBe("hello");

      // Undo second change
      editor.undo();
      expect(editor.page.body[1].props.content).toBe("b2");
      expect(editor.page.body[0].props.color).toBe("red");

      // Undo first change
      editor.undo();
      expect(editor.page.body[0].props.color).toBeUndefined();
    });
  });

  describe("add block", () => {
    it("add block then undo removes it", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("existing")] }),
      );
      expect(editor.page.body).toHaveLength(1);

      editor.addBlock("_spacer");
      expect(editor.page.body).toHaveLength(2);

      editor.undo();
      expect(editor.page.body).toHaveLength(1);
      expect(editor.page.body[0].id).toBe("existing");
    });
  });

  describe("delete block", () => {
    it("delete block then undo restores it at correct position", () => {
      const editor = new EditorState(
        makePage({
          body: [makeBlock("a"), makeBlock("b"), makeBlock("c")],
        }),
      );

      editor.selectBlock("b");
      editor.removeBlock("b");
      expect(bodyIds(editor)).toEqual(["a", "c"]);

      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b", "c"]);
      // Selection should also be restored
      expect(editor.selectedBlockId).toBe("b");
    });
  });

  describe("move block", () => {
    it("move block up then undo returns to original position", () => {
      const editor = new EditorState(
        makePage({
          body: [makeBlock("a"), makeBlock("b"), makeBlock("c")],
        }),
      );

      editor.moveBlockUp("b");
      expect(bodyIds(editor)).toEqual(["b", "a", "c"]);

      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b", "c"]);
    });

    it("move block down then undo returns to original position", () => {
      const editor = new EditorState(
        makePage({
          body: [makeBlock("a"), makeBlock("b"), makeBlock("c")],
        }),
      );

      editor.moveBlockDown("b");
      expect(bodyIds(editor)).toEqual(["a", "c", "b"]);

      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b", "c"]);
    });
  });

  describe("drag-and-drop", () => {
    it("drag block to new position then undo returns it", () => {
      const editor = new EditorState(
        makePage({
          body: [makeBlock("a"), makeBlock("b"), makeBlock("c")],
        }),
      );

      // Simulate drag of 'a' to after 'c'
      editor.startBlockDrag("a");
      editor.setDropTarget({ blockId: "c", position: "after" });
      editor.executeDrop();
      editor.endDrag();

      expect(bodyIds(editor)).toEqual(["b", "c", "a"]);

      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b", "c"]);
    });

    it("drag palette item into canvas then undo removes it", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("existing")] }),
      );

      // Simulate palette drag of a _spacer to end of body
      editor.startPaletteDrag("_spacer");
      editor.setDropTarget({ blockId: null, position: "inside" });
      editor.executeDrop();
      editor.endDrag();

      expect(editor.page.body).toHaveLength(2);
      expect(editor.page.body[1].type).toBe("_spacer");

      editor.undo();
      expect(editor.page.body).toHaveLength(1);
      expect(editor.page.body[0].id).toBe("existing");
    });
  });

  describe("redo", () => {
    it("undo several times then redo restores", () => {
      const editor = new EditorState(
        makePage({
          body: [makeBlock("a"), makeBlock("b"), makeBlock("c")],
        }),
      );

      // [a, b, c] → remove 'a' → [b, c] → remove 'c' → [b]
      editor.removeBlock("a");
      editor.removeBlock("c");
      expect(bodyIds(editor)).toEqual(["b"]);

      // Undo removeBlock('c') → back to [b, c]
      editor.undo();
      expect(bodyIds(editor)).toEqual(["b", "c"]);

      // Undo removeBlock('a') → back to [a, b, c]
      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b", "c"]);

      // Redo removeBlock('a') → [b, c]
      editor.redo();
      expect(bodyIds(editor)).toEqual(["b", "c"]);

      // Redo removeBlock('c') → [b]
      editor.redo();
      expect(bodyIds(editor)).toEqual(["b"]);
    });

    it("new change after undo clears redo stack", () => {
      const editor = new EditorState(
        makePage({
          body: [makeBlock("a"), makeBlock("b")],
        }),
      );

      editor.removeBlock("b");
      expect(bodyIds(editor)).toEqual(["a"]);

      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b"]);

      // New action should clear redo
      editor.removeBlock("a");
      expect(bodyIds(editor)).toEqual(["b"]);

      // Redo should have nothing — the redo of removeBlock('b') is gone
      editor.redo();
      expect(bodyIds(editor)).toEqual(["b"]);
    });
  });

  describe("canUndo / canRedo", () => {
    it("reflects state after mutations and undo/redo", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));
      flushSync();

      expect(editor.canUndo).toBe(false);
      expect(editor.canRedo).toBe(false);

      editor.removeBlock("a");
      flushSync();
      expect(editor.canUndo).toBe(true);
      expect(editor.canRedo).toBe(false);

      editor.undo();
      flushSync();
      expect(editor.canUndo).toBe(false);
      expect(editor.canRedo).toBe(true);

      editor.redo();
      flushSync();
      expect(editor.canUndo).toBe(true);
      expect(editor.canRedo).toBe(false);
    });
  });

  describe("selection restoration", () => {
    it("restores selectedBlockId on undo", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b")] }),
      );

      editor.selectBlock("a");

      // Remove 'a' — clears selection
      editor.removeBlock("a");
      expect(editor.selectedBlockId).toBeNull();

      // Undo — restores block AND selection
      editor.undo();
      expect(editor.selectedBlockId).toBe("a");
      expect(bodyIds(editor)).toEqual(["a", "b"]);
    });
  });

  describe("copy and paste", () => {
    it("copies selected block and pastes after it with fresh ID", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b")] }),
      );

      editor.selectBlock("a");
      editor.copyBlock();
      expect(editor.clipboard).not.toBeNull();
      expect(editor.clipboard!.id).not.toBe("a");

      editor.pasteBlock();
      expect(editor.page.body).toHaveLength(3);
      // Pasted block should be after 'a', before 'b'
      expect(editor.page.body[0].id).toBe("a");
      expect(editor.page.body[2].id).toBe("b");
      // Pasted block has new ID, same content
      const pasted = editor.page.body[1];
      expect(pasted.id).not.toBe("a");
      expect(pasted.props.content).toBe("a");
      // Selection moves to pasted
      expect(editor.selectedBlockId).toBe(pasted.id);
    });

    it("paste twice generates different IDs each time", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.selectBlock("a");
      editor.copyBlock();

      editor.pasteBlock();
      const firstPastedId = editor.selectedBlockId;

      editor.pasteBlock();
      const secondPastedId = editor.selectedBlockId;

      expect(firstPastedId).not.toBe(secondPastedId);
      expect(editor.page.body).toHaveLength(3);
    });

    it("paste with no selection appends to root", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.selectBlock("a");
      editor.copyBlock();
      editor.deselectBlock();

      editor.pasteBlock();
      expect(editor.page.body).toHaveLength(2);
      expect(editor.page.body[1].props.content).toBe("a");
    });

    it("paste is undoable", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.selectBlock("a");
      editor.copyBlock();
      editor.pasteBlock();
      expect(editor.page.body).toHaveLength(2);

      editor.undo();
      expect(editor.page.body).toHaveLength(1);
      expect(editor.page.body[0].id).toBe("a");
    });

    it("does nothing if clipboard is empty", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.pasteBlock();
      expect(editor.page.body).toHaveLength(1);
    });

    it("does nothing if no block selected on copy", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.copyBlock();
      expect(editor.clipboard).toBeNull();
    });
  });

  describe("cut", () => {
    it("removes block and populates clipboard", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b")] }),
      );

      editor.selectBlock("a");
      editor.cutBlock();

      expect(bodyIds(editor)).toEqual(["b"]);
      expect(editor.clipboard).not.toBeNull();
      expect(editor.clipboard!.props.content).toBe("a");
    });

    it("cut then paste restores block elsewhere", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b"), makeBlock("c")] }),
      );

      editor.selectBlock("a");
      editor.cutBlock();
      expect(bodyIds(editor)).toEqual(["b", "c"]);

      editor.selectBlock("c");
      editor.pasteBlock();

      expect(editor.page.body).toHaveLength(3);
      // Pasted after 'c'
      const pasted = editor.page.body[2];
      expect(pasted.props.content).toBe("a");
    });

    it("undo after cut restores the removed block", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b")] }),
      );

      editor.selectBlock("a");
      editor.cutBlock();
      expect(bodyIds(editor)).toEqual(["b"]);

      editor.undo();
      expect(bodyIds(editor)).toEqual(["a", "b"]);
      // Clipboard stays populated after undo
      expect(editor.clipboard).not.toBeNull();
    });
  });

  describe("duplicate", () => {
    it("creates a copy after the selected block", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b")] }),
      );

      editor.selectBlock("a");
      editor.duplicateBlock();

      expect(editor.page.body).toHaveLength(3);
      expect(editor.page.body[0].id).toBe("a");
      expect(editor.page.body[2].id).toBe("b");
      // Duplicate has same content but different ID
      const dup = editor.page.body[1];
      expect(dup.id).not.toBe("a");
      expect(dup.props.content).toBe("a");
      // Selection moves to duplicate
      expect(editor.selectedBlockId).toBe(dup.id);
    });

    it("duplicate is undoable in one step", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.selectBlock("a");
      editor.duplicateBlock();
      expect(editor.page.body).toHaveLength(2);

      editor.undo();
      expect(editor.page.body).toHaveLength(1);
      expect(editor.page.body[0].id).toBe("a");
      expect(editor.selectedBlockId).toBe("a");
    });

    it("does nothing with no selection", () => {
      const editor = new EditorState(makePage({ body: [makeBlock("a")] }));

      editor.duplicateBlock();
      expect(editor.page.body).toHaveLength(1);
    });
  });

  describe("arrow navigation", () => {
    it("selectNext cycles through blocks in tree order", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b"), makeBlock("c")] }),
      );

      // No selection → selects first
      editor.selectNext();
      expect(editor.selectedBlockId).toBe("a");

      editor.selectNext();
      expect(editor.selectedBlockId).toBe("b");

      editor.selectNext();
      expect(editor.selectedBlockId).toBe("c");

      // Wraps around
      editor.selectNext();
      expect(editor.selectedBlockId).toBe("a");
    });

    it("selectPrev cycles in reverse", () => {
      const editor = new EditorState(
        makePage({ body: [makeBlock("a"), makeBlock("b"), makeBlock("c")] }),
      );

      // No selection → selects last
      editor.selectPrev();
      expect(editor.selectedBlockId).toBe("c");

      editor.selectPrev();
      expect(editor.selectedBlockId).toBe("b");

      editor.selectPrev();
      expect(editor.selectedBlockId).toBe("a");

      // Wraps around
      editor.selectPrev();
      expect(editor.selectedBlockId).toBe("c");
    });

    it("handles nested children in tree order", () => {
      const parentBlock: BlockNode = {
        id: "parent",
        type: "_container",
        props: {},
        children: [makeBlock("child1"), makeBlock("child2")],
      };
      const editor = new EditorState(
        makePage({ body: [parentBlock, makeBlock("sibling")] }),
      );

      editor.selectNext();
      expect(editor.selectedBlockId).toBe("parent");

      editor.selectNext();
      expect(editor.selectedBlockId).toBe("child1");

      editor.selectNext();
      expect(editor.selectedBlockId).toBe("child2");

      editor.selectNext();
      expect(editor.selectedBlockId).toBe("sibling");
    });

    it("does nothing with empty body", () => {
      const editor = new EditorState(makePage());

      editor.selectNext();
      expect(editor.selectedBlockId).toBeNull();

      editor.selectPrev();
      expect(editor.selectedBlockId).toBeNull();
    });
  });

  describe("requestSave", () => {
    it("calls onSave callback when set", () => {
      const editor = new EditorState(makePage());
      const saveFn = vi.fn();
      editor.onSave = saveFn;

      editor.requestSave();
      expect(saveFn).toHaveBeenCalledOnce();
    });

    it("does nothing when onSave is not set", () => {
      const editor = new EditorState(makePage());
      // Should not throw
      editor.requestSave();
    });
  });
});
