/**
 * Drag-and-drop utilities for the site builder.
 */

import type { BlockNode } from "../types/page.js";
import { findNode } from "./tree.js";

/** Movement threshold (px) before a pointerdown becomes a drag */
export const DRAG_THRESHOLD = 5;

/**
 * Calculate drop position based on mouse Y within an element.
 * Containers: top 25% = before, middle 50% = inside, bottom 25% = after
 * Non-containers: top 50% = before, bottom 50% = after
 */
export function calculateDropPosition(
  clientY: number,
  rect: DOMRect,
  isContainer: boolean,
): "before" | "after" | "inside" {
  const relY = clientY - rect.top;
  const h = rect.height;
  if (isContainer) {
    if (relY < h * 0.25) return "before";
    if (relY > h * 0.75) return "after";
    return "inside";
  }
  return relY < h * 0.5 ? "before" : "after";
}

/**
 * Check if dropping draggedBlockId onto targetId is valid.
 * Prevents: drop on self, drop into own descendant.
 * Palette items (no draggedBlockId) are always valid.
 */
export function isValidDrop(
  draggedBlockId: string | undefined,
  targetId: string,
  nodes: BlockNode[],
): boolean {
  if (!draggedBlockId) return true;
  if (draggedBlockId === targetId) return false;
  const dragged = findNode(nodes, draggedBlockId);
  if (dragged?.children && findNode(dragged.children, targetId)) return false;
  return true;
}
