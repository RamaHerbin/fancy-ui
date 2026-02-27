/**
 * TEMPLATE: index.ts
 *
 * Barrel file for component exports.
 *
 * Instructions:
 * 1. Rename ComponentName to your actual component name
 * 2. Update the import path to match your .svelte file
 * 3. Export any additional types from types.ts that consumers need
 * 4. Delete this comment block when done
 */

// =============================================================================
// Main Component Export
// =============================================================================

import ComponentName, { type ComponentNameProps } from "./Component.svelte";

export { ComponentName, type ComponentNameProps };

// =============================================================================
// Type Exports (optional)
// Only export types that consumers of the component might need
// =============================================================================

// export type { ComponentConfig, ComponentItem } from './types.js';

// =============================================================================
// Subcomponent Exports (if applicable)
// Some components have multiple parts (e.g., Tabs, TabsList, TabsTrigger)
// =============================================================================

// export { ComponentNameItem } from './ComponentNameItem.svelte';
// export { ComponentNameTrigger } from './ComponentNameTrigger.svelte';
