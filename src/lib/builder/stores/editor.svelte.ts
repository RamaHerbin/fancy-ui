/**
 * Editor State Store
 *
 * Class-based Svelte 5 runes store for the site builder editor.
 * Shared via setContext/getContext.
 */

import { setContext, getContext } from 'svelte';
import type { PageDocument, BlockNode, BuilderComponentMeta } from '../types/index.js';
import { getBuilderComponent, getDefaultProps } from '../registry/index.js';
import { findNode, findParent, removeNode, createBlockId } from '../utils/index.js';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

const EDITOR_CTX_KEY = Symbol('editor-state');

export class EditorState {
	page: PageDocument = $state() as PageDocument;
	selectedBlockId: string | null = $state(null);
	viewport: Viewport = $state('desktop');

	selectedBlock: BlockNode | undefined = $derived.by(() => {
		if (!this.selectedBlockId) return undefined;
		return findNode(this.page.body, this.selectedBlockId);
	});

	selectedMeta: BuilderComponentMeta | undefined = $derived.by(() => {
		if (!this.selectedBlock) return undefined;
		return getBuilderComponent(this.selectedBlock.type);
	});

	constructor(page: PageDocument) {
		this.page = page;
	}

	selectBlock(id: string) {
		this.selectedBlockId = id;
	}

	deselectBlock() {
		this.selectedBlockId = null;
	}

	updateBlockProp(blockId: string, key: string, value: unknown) {
		const node = findNode(this.page.body, blockId);
		if (!node) return;
		node.props[key] = value;
	}

	addBlock(type: string, parentId?: string | null, index?: number) {
		const meta = getBuilderComponent(type);
		if (!meta) return;

		const newNode: BlockNode = {
			id: createBlockId(),
			type,
			props: getDefaultProps(type)
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
		if (this.selectedBlockId === id) {
			this.selectedBlockId = null;
		}
		removeNode(this.page.body, id);
	}

	moveBlockUp(id: string) {
		const result = findParent(this.page.body, id);
		if (!result || result.index === 0) return;
		const [node] = result.parent.splice(result.index, 1);
		result.parent.splice(result.index - 1, 0, node);
	}

	moveBlockDown(id: string) {
		const result = findParent(this.page.body, id);
		if (!result || result.index >= result.parent.length - 1) return;
		const [node] = result.parent.splice(result.index, 1);
		result.parent.splice(result.index + 1, 0, node);
	}

	updatePageMeta(key: string, value: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.page.meta as any)[key] = value;
	}
}

export function createEditorState(page: PageDocument): EditorState {
	const state = new EditorState(page);
	setContext(EDITOR_CTX_KEY, state);
	return state;
}

export function getEditorState(): EditorState {
	return getContext<EditorState>(EDITOR_CTX_KEY);
}
