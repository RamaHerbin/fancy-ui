import { describe, it, expect } from 'vitest';
import type { BlockNode } from '../types/page.js';
import {
	findNode,
	findParentId,
	findParent,
	removeNode,
	insertNode,
	moveNode,
	cloneNode,
	countNodes,
	flattenTree
} from './tree.js';

function makeNode(id: string, children?: BlockNode[]): BlockNode {
	return { id, type: '_text', props: { content: id }, children };
}

function makeTree(): BlockNode[] {
	return [
		makeNode('a', [makeNode('a1'), makeNode('a2', [makeNode('a2x')])]),
		makeNode('b'),
		makeNode('c', [makeNode('c1')])
	];
}

describe('findNode', () => {
	it('finds root-level node', () => {
		expect(findNode(makeTree(), 'b')?.id).toBe('b');
	});

	it('finds deeply nested node', () => {
		expect(findNode(makeTree(), 'a2x')?.id).toBe('a2x');
	});

	it('returns undefined for missing id', () => {
		expect(findNode(makeTree(), 'zzz')).toBeUndefined();
	});
});

describe('findParentId', () => {
	it('returns null for root-level node', () => {
		expect(findParentId(makeTree(), 'b')).toBeNull();
	});

	it('returns parent ID for direct child', () => {
		expect(findParentId(makeTree(), 'a1')).toBe('a');
	});

	it('returns parent ID for deeply nested node', () => {
		expect(findParentId(makeTree(), 'a2x')).toBe('a2');
	});

	it('returns null for missing id', () => {
		expect(findParentId(makeTree(), 'zzz')).toBeNull();
	});
});

describe('findParent', () => {
	it('finds parent array and index for root node', () => {
		const tree = makeTree();
		const result = findParent(tree, 'b');
		expect(result).toBeDefined();
		expect(result!.index).toBe(1);
		expect(result!.parent).toBe(tree);
	});

	it('finds parent array and index for nested node', () => {
		const tree = makeTree();
		const result = findParent(tree, 'a2x');
		expect(result).toBeDefined();
		expect(result!.index).toBe(0);
		expect(result!.parent[0].id).toBe('a2x');
	});

	it('returns undefined for missing id', () => {
		expect(findParent(makeTree(), 'zzz')).toBeUndefined();
	});
});

describe('removeNode', () => {
	it('removes a root node', () => {
		const tree = makeTree();
		const removed = removeNode(tree, 'b');
		expect(removed?.id).toBe('b');
		expect(tree.length).toBe(2);
		expect(findNode(tree, 'b')).toBeUndefined();
	});

	it('removes a nested node', () => {
		const tree = makeTree();
		const removed = removeNode(tree, 'a2x');
		expect(removed?.id).toBe('a2x');
		expect(findNode(tree, 'a2')?.children).toHaveLength(0);
	});

	it('returns undefined for missing id', () => {
		const tree = makeTree();
		expect(removeNode(tree, 'zzz')).toBeUndefined();
		expect(tree.length).toBe(3);
	});
});

describe('insertNode', () => {
	it('inserts at root level', () => {
		const tree = makeTree();
		const node = makeNode('new');
		insertNode(tree, null, 1, node);
		expect(tree[1].id).toBe('new');
		expect(tree.length).toBe(4);
	});

	it('inserts as child of existing node', () => {
		const tree = makeTree();
		const node = makeNode('new');
		insertNode(tree, 'b', 0, node);
		expect(findNode(tree, 'b')?.children?.[0].id).toBe('new');
	});

	it('clamps negative index to 0', () => {
		const tree = makeTree();
		insertNode(tree, null, -5, makeNode('front'));
		expect(tree[0].id).toBe('front');
	});

	it('clamps out-of-bounds index to end', () => {
		const tree = makeTree();
		insertNode(tree, null, 999, makeNode('end'));
		expect(tree[tree.length - 1].id).toBe('end');
	});

	it('returns false for missing parent', () => {
		expect(insertNode(makeTree(), 'zzz', 0, makeNode('x'))).toBe(false);
	});
});

describe('moveNode', () => {
	it('moves a node to a new position at root', () => {
		const tree = makeTree();
		moveNode(tree, 'c', null, 0);
		expect(tree[0].id).toBe('c');
	});

	it('moves a node into a new parent', () => {
		const tree = makeTree();
		moveNode(tree, 'b', 'c', 0);
		expect(findNode(tree, 'c')?.children?.[0].id).toBe('b');
		expect(tree.length).toBe(2);
	});

	it('prevents moving a node into itself', () => {
		const tree = makeTree();
		const result = moveNode(tree, 'a', 'a', 0);
		expect(result).toBe(false);
		expect(tree.length).toBe(3);
	});

	it('prevents moving a node into its own descendant', () => {
		const tree = makeTree();
		const result = moveNode(tree, 'a', 'a2x', 0);
		expect(result).toBe(false);
		expect(tree.length).toBe(3);
	});
});

describe('cloneNode', () => {
	let counter = 0;
	const idFn = () => `clone-${counter++}`;

	it('creates a new id', () => {
		counter = 0;
		const original = makeNode('orig');
		const clone = cloneNode(original, idFn);
		expect(clone.id).not.toBe(original.id);
	});

	it('deep clones props (no shared references)', () => {
		counter = 0;
		const original: BlockNode = {
			id: 'orig',
			type: 'flip-words',
			props: { words: ['a', 'b'] }
		};
		const clone = cloneNode(original, idFn);
		(clone.props.words as string[]).push('c');
		expect((original.props.words as string[]).length).toBe(2);
	});

	it('recursively clones children with new ids', () => {
		counter = 0;
		const original = makeNode('p', [makeNode('c1'), makeNode('c2')]);
		const clone = cloneNode(original, idFn);
		expect(clone.children).toHaveLength(2);
		expect(clone.children![0].id).not.toBe('c1');
		expect(clone.children![1].id).not.toBe('c2');
	});
});

describe('countNodes', () => {
	it('counts all nodes in a tree', () => {
		expect(countNodes(makeTree())).toBe(7);
	});

	it('returns 0 for empty tree', () => {
		expect(countNodes([])).toBe(0);
	});
});

describe('flattenTree', () => {
	it('flattens all nodes depth-first', () => {
		const flat = flattenTree(makeTree());
		expect(flat.map((n) => n.id)).toEqual(['a', 'a1', 'a2', 'a2x', 'b', 'c', 'c1']);
	});

	it('returns empty for empty tree', () => {
		expect(flattenTree([])).toEqual([]);
	});
});
