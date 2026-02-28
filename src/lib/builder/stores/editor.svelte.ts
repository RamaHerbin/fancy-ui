/**
 * Editor State Store
 *
 * Class-based Svelte 5 runes store for the site builder editor.
 * Shared via setContext/getContext.
 */

import { setContext, getContext } from "svelte";
import type { PageDocument, BlockNode, BuilderComponentMeta } from "../types/index.js";
import type { SiteConfig } from "../types/site.js";
import type { PageListItem } from "../storage/types.js";
import { getBuilderComponent, getDefaultProps } from "../registry/index.js";
import {
	findNode,
	findParentId,
	findParent,
	removeNode,
	moveNode,
	insertNode,
	cloneNode,
	flattenTree,
	createBlockId,
} from "../utils/index.js";
import { HistoryManager } from "./history.svelte.js";

export type Viewport = "desktop" | "tablet" | "mobile";
export type EditorMode = "edit" | "interact";

export type DragSource = { type: "block"; blockId: string } | { type: "palette"; slug: string };

export interface DropTarget {
	blockId: string | null;
	position: "before" | "after" | "inside";
}

const EDITOR_CTX_KEY = Symbol("editor-state");

export class EditorState {
	page: PageDocument = $state() as PageDocument;
	selectedBlockId: string | null = $state(null);
	viewport: Viewport = $state("desktop");
	mode: EditorMode = $state("edit");
	inlineEditBlockId: string | null = $state(null);

	// Drag-and-drop state
	dragSource: DragSource | null = $state(null);
	dropTarget: DropTarget | null = $state(null);
	pointerX: number = $state(0);
	pointerY: number = $state(0);

	// Undo/redo history
	private history = new HistoryManager();
	canUndo: boolean = $derived(this.history.canUndo);
	canRedo: boolean = $derived(this.history.canRedo);

	// Clipboard (in-memory, session-scoped)
	clipboard: BlockNode | null = $state(null);

	// Site-level awareness
	siteConfig: SiteConfig | null = $state(null);
	allPages: PageListItem[] = $state([]);

	// Save callback — wired by TopBar
	onSave: (() => void) | null = null;

	isDragging = $derived(this.dragSource !== null);

	selectedBlock: BlockNode | undefined = $derived.by(() => {
		if (!this.selectedBlockId) return undefined;
		return findNode(this.page.body, this.selectedBlockId);
	});

	selectedMeta: BuilderComponentMeta | undefined = $derived.by(() => {
		if (!this.selectedBlock) return undefined;
		return getBuilderComponent(this.selectedBlock.type);
	});

	constructor(
		page: PageDocument,
		options?: { siteConfig?: SiteConfig | null; allPages?: PageListItem[] }
	) {
		this.page = page;
		if (options?.siteConfig !== undefined) this.siteConfig = options.siteConfig;
		if (options?.allPages) this.allPages = options.allPages;
	}

	/** Replace the current page and reset editor state */
	loadPage(
		page: PageDocument,
		options?: { siteConfig?: SiteConfig | null; allPages?: PageListItem[] }
	) {
		this.page = page;
		this.selectedBlockId = null;
		this.inlineEditBlockId = null;
		this.dragSource = null;
		this.dropTarget = null;
		this.clipboard = null;
		this.history = new HistoryManager();
		if (options?.siteConfig !== undefined) this.siteConfig = options.siteConfig;
		if (options?.allPages) this.allPages = options.allPages;
	}

	selectBlock(id: string) {
		this.selectedBlockId = id;
	}

	deselectBlock() {
		this.selectedBlockId = null;
		this.stopInlineEdit();
	}

	toggleMode() {
		this.mode = this.mode === "edit" ? "interact" : "edit";
		if (this.mode === "interact") {
			this.selectedBlockId = null;
			this.stopInlineEdit();
			this.endDrag();
		}
	}

	startInlineEdit(id: string) {
		if (this.mode !== "edit") return;
		const node = findNode(this.page.body, id);
		if (!node || node.type !== "_text") return;
		this.selectedBlockId = id;
		this.inlineEditBlockId = id;
	}

	stopInlineEdit() {
		this.inlineEditBlockId = null;
	}

	updateBlockProp(blockId: string, key: string, value: unknown) {
		const node = findNode(this.page.body, blockId);
		if (!node) return;
		this.history.push(this.page, this.selectedBlockId, {
			type: "prop",
			blockId,
			key,
		});
		node.props[key] = value;
	}

	addBlock(type: string, parentId?: string | null, index?: number) {
		const meta = getBuilderComponent(type);
		if (!meta) return;

		this.history.push(this.page, this.selectedBlockId, { type: "structure" });

		const newNode: BlockNode = {
			id: createBlockId(),
			type,
			props: getDefaultProps(type),
		};

		if (meta.acceptsChildren) {
			newNode.children = [];
		}

		if (parentId) {
			const parent = findNode(this.page.body, parentId);
			if (!parent) return;
			if (!parent.children) parent.children = [];
			const idx = index ?? parent.children.length;
			parent.children.splice(idx, 0, newNode);
		} else {
			const idx = index ?? this.page.body.length;
			this.page.body.splice(idx, 0, newNode);
		}

		this.selectedBlockId = newNode.id;
	}

	removeBlock(id: string) {
		this.history.push(this.page, this.selectedBlockId, { type: "structure" });
		if (this.selectedBlockId === id) {
			this.selectedBlockId = null;
		}
		removeNode(this.page.body, id);
	}

	moveBlockUp(id: string) {
		const result = findParent(this.page.body, id);
		if (!result || result.index === 0) return;
		this.history.push(this.page, this.selectedBlockId, { type: "structure" });
		const [node] = result.parent.splice(result.index, 1);
		result.parent.splice(result.index - 1, 0, node);
	}

	moveBlockDown(id: string) {
		const result = findParent(this.page.body, id);
		if (!result || result.index >= result.parent.length - 1) return;
		this.history.push(this.page, this.selectedBlockId, { type: "structure" });
		const [node] = result.parent.splice(result.index, 1);
		result.parent.splice(result.index + 1, 0, node);
	}

	updatePageMeta(key: string, value: unknown) {
		this.history.push(this.page, this.selectedBlockId, { type: "meta", key });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.page.meta as any)[key] = value;
	}

	// --- Drag-and-drop methods ---

	startPaletteDrag(slug: string) {
		this.dragSource = { type: "palette", slug };
	}

	startBlockDrag(blockId: string) {
		this.dragSource = { type: "block", blockId };
	}

	setDropTarget(target: DropTarget | null) {
		this.dropTarget = target;
	}

	updatePointer(x: number, y: number) {
		this.pointerX = x;
		this.pointerY = y;
	}

	private calculateInsertPosition(): {
		parentId: string | null;
		index: number;
	} | null {
		if (!this.dropTarget) return null;

		const { blockId, position } = this.dropTarget;

		if (blockId === null) {
			return { parentId: null, index: this.page.body.length };
		}

		if (position === "inside") {
			return { parentId: blockId, index: 0 };
		}

		const parentId = findParentId(this.page.body, blockId);
		const result = findParent(this.page.body, blockId);
		if (!result) return null;

		let index = position === "before" ? result.index : result.index + 1;

		// Adjust for same-parent moves: removeNode shifts indices down when
		// the dragged block sits before the computed destination.
		if (this.dragSource?.type === "block") {
			const srcResult = findParent(this.page.body, this.dragSource.blockId);
			if (srcResult && srcResult.parent === result.parent && srcResult.index < index) {
				index -= 1;
			}
		}

		return { parentId, index };
	}

	executeDrop(): boolean {
		if (!this.dragSource || !this.dropTarget) return false;

		const pos = this.calculateInsertPosition();
		if (!pos) return false;

		if (this.dragSource.type === "palette") {
			// addBlock calls history.push() internally
			this.addBlock(this.dragSource.slug, pos.parentId, pos.index);
			return true;
		}

		if (this.dragSource.type === "block") {
			this.history.push(this.page, this.selectedBlockId, { type: "structure" });
			const success = moveNode(this.page.body, this.dragSource.blockId, pos.parentId, pos.index);
			if (success) {
				this.selectedBlockId = this.dragSource.blockId;
			}
			return success;
		}

		return false;
	}

	endDrag() {
		this.dragSource = null;
		this.dropTarget = null;
	}

	// --- Undo/Redo ---

	undo() {
		const snapshot = this.history.undo(this.page, this.selectedBlockId);
		if (!snapshot) return;
		this.page = snapshot.page;
		this.selectedBlockId = snapshot.selectedBlockId;
	}

	redo() {
		const snapshot = this.history.redo(this.page, this.selectedBlockId);
		if (!snapshot) return;
		this.page = snapshot.page;
		this.selectedBlockId = snapshot.selectedBlockId;
	}

	// --- Save ---

	requestSave() {
		this.onSave?.();
	}

	// --- Navigation ---

	selectNext() {
		const flat = flattenTree(this.page.body);
		if (flat.length === 0) return;
		if (!this.selectedBlockId) {
			this.selectedBlockId = flat[0].id;
			return;
		}
		const idx = flat.findIndex((n) => n.id === this.selectedBlockId);
		const next = (idx + 1) % flat.length;
		this.selectedBlockId = flat[next].id;
	}

	selectPrev() {
		const flat = flattenTree(this.page.body);
		if (flat.length === 0) return;
		if (!this.selectedBlockId) {
			this.selectedBlockId = flat[flat.length - 1].id;
			return;
		}
		const idx = flat.findIndex((n) => n.id === this.selectedBlockId);
		const prev = (idx - 1 + flat.length) % flat.length;
		this.selectedBlockId = flat[prev].id;
	}

	// --- Clipboard ---

	copyBlock() {
		if (!this.selectedBlock) return;
		const snapshot = $state.snapshot(this.selectedBlock);
		this.clipboard = cloneNode(snapshot, createBlockId);
	}

	cutBlock() {
		if (!this.selectedBlockId) return;
		const blockId = this.selectedBlockId;
		this.copyBlock();
		this.removeBlock(blockId);
	}

	pasteBlock() {
		if (!this.clipboard) return;
		const clone = cloneNode($state.snapshot(this.clipboard), createBlockId);

		if (this.selectedBlockId) {
			const parentId = findParentId(this.page.body, this.selectedBlockId);
			const result = findParent(this.page.body, this.selectedBlockId);
			if (!result) return;
			this.history.push(this.page, this.selectedBlockId, { type: "structure" });
			insertNode(this.page.body, parentId, result.index + 1, clone);
		} else {
			this.history.push(this.page, this.selectedBlockId, { type: "structure" });
			this.page.body.push(clone);
		}

		this.selectedBlockId = clone.id;
	}

	duplicateBlock() {
		if (!this.selectedBlockId || !this.selectedBlock) return;
		const snapshot = $state.snapshot(this.selectedBlock);
		const clone = cloneNode(snapshot, createBlockId);

		const parentId = findParentId(this.page.body, this.selectedBlockId);
		const result = findParent(this.page.body, this.selectedBlockId);
		if (!result) return;

		this.history.push(this.page, this.selectedBlockId, { type: "structure" });
		insertNode(this.page.body, parentId, result.index + 1, clone);

		this.selectedBlockId = clone.id;
	}
}

export function createEditorState(
	page: PageDocument,
	options?: { siteConfig?: SiteConfig | null; allPages?: PageListItem[] }
): EditorState {
	const state = new EditorState(page, options);
	setContext(EDITOR_CTX_KEY, state);
	return state;
}

export function getEditorState(): EditorState {
	return getContext<EditorState>(EDITOR_CTX_KEY);
}
