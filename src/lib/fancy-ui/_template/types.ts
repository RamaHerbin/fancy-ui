/**
 * TEMPLATE: types.ts
 *
 * Component-specific type definitions.
 *
 * Instructions:
 * 1. Rename types to match your component (e.g., ComponentNameItem, ComponentNameConfig)
 * 2. Export types that consumers might need
 * 3. Keep internal types unexported
 * 4. Delete this comment block and unused examples when done
 */

// =============================================================================
// Configuration Types
// Use for complex prop objects (e.g., animation configs, style configs)
// =============================================================================

/**
 * Example: Configuration object for component behavior
 * Rename to [ComponentName]Config
 */
export interface ComponentConfig {
	/** Enable feature X */
	enabled?: boolean;
	/** Configuration value */
	value?: number;
}

// =============================================================================
// Item/Data Types
// Use for array items or structured data the component displays
// =============================================================================

/**
 * Example: Item type for list/collection components
 * Rename to [ComponentName]Item
 */
export interface ComponentItem {
	/** Unique identifier */
	id: string;
	/** Display label */
	label: string;
	/** Optional icon name */
	icon?: string;
}

// =============================================================================
// State Types
// Use for internal component state that might be exposed via bindable
// =============================================================================

/**
 * Example: State type for components with complex internal state
 * Rename to [ComponentName]State
 */
export interface ComponentState {
	/** Current index */
	currentIndex: number;
	/** Whether component is active */
	isActive: boolean;
}

// =============================================================================
// Event Types
// Use for custom event payloads
// =============================================================================

/**
 * Example: Event detail for custom component events
 * Rename to [ComponentName]ChangeEvent or similar
 */
export interface ComponentChangeEvent {
	/** Previous value */
	previousValue: unknown;
	/** New value */
	newValue: unknown;
}
