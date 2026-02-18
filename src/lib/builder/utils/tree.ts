/**
 * Tree manipulation utilities for BlockNode trees.
 */

import type { BlockNode } from '../types/page.js';

/** Find a node by ID in a tree (depth-first) */
export function findNode(nodes: BlockNode[], id: string): BlockNode | undefined {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (node.children) {
			const found = findNode(node.children, id);
			if (found) return found;
		}
	}
	return undefined;
}

/** Find the parent of a node by the node's ID */
export function findParent(
	nodes: BlockNode[],
	id: string
): { parent: BlockNode[]; index: number } | undefined {
	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i].id === id) {
			return { parent: nodes, index: i };
		}
		if (nodes[i].children) {
			const found = findParent(nodes[i].children!, id);
			if (found) return found;
		}
	}
	return undefined;
}

/** Remove a node by ID from the tree. Returns the removed node or undefined. */
export function removeNode(nodes: BlockNode[], id: string): BlockNode | undefined {
	const result = findParent(nodes, id);
	if (!result) return undefined;
	return result.parent.splice(result.index, 1)[0];
}

/** Insert a node at a specific position in the tree. Index is clamped to valid range. */
export function insertNode(
	nodes: BlockNode[],
	parentId: string | null,
	index: number,
	node: BlockNode
): boolean {
	if (parentId === null) {
		const clamped = Math.max(0, Math.min(index, nodes.length));
		nodes.splice(clamped, 0, node);
		return true;
	}

	const parent = findNode(nodes, parentId);
	if (!parent) return false;

	if (!parent.children) parent.children = [];
	const clamped = Math.max(0, Math.min(index, parent.children.length));
	parent.children.splice(clamped, 0, node);
	return true;
}

/** Check if `ancestorId` is an ancestor of `nodeId` in the tree */
function isDescendant(nodes: BlockNode[], ancestorId: string, nodeId: string): boolean {
	const ancestor = findNode(nodes, ancestorId);
	if (!ancestor?.children) return false;
	return !!findNode(ancestor.children, nodeId);
}

/** Move a node from one position to another. Prevents circular references. */
export function moveNode(
	nodes: BlockNode[],
	nodeId: string,
	newParentId: string | null,
	newIndex: number
): boolean {
	if (newParentId !== null && (newParentId === nodeId || isDescendant(nodes, nodeId, newParentId))) {
		return false;
	}
	const removed = removeNode(nodes, nodeId);
	if (!removed) return false;
	return insertNode(nodes, newParentId, newIndex, removed);
}

/** Deep clone a node tree (for copy/paste) */
export function cloneNode(node: BlockNode, newIdFn: () => string): BlockNode {
	return {
		...node,
		id: newIdFn(),
		props: structuredClone(node.props),
		children: node.children?.map((child) => cloneNode(child, newIdFn))
	};
}

/** Count all nodes in a tree */
export function countNodes(nodes: BlockNode[]): number {
	let count = 0;
	for (const node of nodes) {
		count += 1;
		if (node.children) {
			count += countNodes(node.children);
		}
	}
	return count;
}

/** Flatten a tree into a flat array */
export function flattenTree(nodes: BlockNode[]): BlockNode[] {
	const result: BlockNode[] = [];
	for (const node of nodes) {
		result.push(node);
		if (node.children) {
			result.push(...flattenTree(node.children));
		}
	}
	return result;
}
