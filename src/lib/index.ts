/**
 * FancyUI - Main Library Entry Point
 *
 * This file provides centralized exports for the library.
 * Import from '$lib' for convenient access to all exports.
 *
 * @example
 * ```svelte
 * <script>
 *   import { cn, RainbowButton } from '$lib';
 * </script>
 * ```
 */

// ============================================================================
// Utilities
// ============================================================================

export { cn } from "./utils.js";

// ============================================================================
// Utility Types (from utils.ts)
// ============================================================================

export type {
  WithoutChild,
  WithoutChildren,
  WithoutChildrenOrChild,
  WithElementRef,
} from "./utils.js";

// ============================================================================
// Shared Component Types
// ============================================================================

export type {
  // Base props
  BaseComponentProps,
  AnimatedComponentProps,
  InteractiveComponentProps,
  PolymorphicButtonProps,
  // Event handlers
  MouseEventHandler,
  KeyboardEventHandler,
  FocusEventHandler,
  // Utility types
  ComponentProps,
  // Registry types
  ComponentStatus,
  ComponentCategory,
  ComponentMeta,
} from "./types.js";

// ============================================================================
// Stores
// ============================================================================

export {
  type Theme,
  type ResolvedTheme,
  type ThemeState,
  setTheme,
  toggleTheme,
  cycleTheme,
  getTheme,
  getResolvedTheme,
  getReducedMotion,
  getThemeState,
  isDark,
  isLight,
  createThemeState,
} from "./stores/index.js";

// ============================================================================
// FancyUI Components
// ============================================================================

export * from "./fancy-ui/index.js";
