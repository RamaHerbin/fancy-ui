// Types for scripts/i18n-context.mjs, which the TypeScript quality test imports.

export interface ContextEntry {
	en: string;
	context: string | null;
	maxLen: number | null;
	render: string | null;
}

export type ContextMap = Record<string, ContextEntry>;

export function buildContext(): ContextMap;
export function serialize(ctx: ContextMap): string;
export function withoutRender(ctx: ContextMap): Record<string, Omit<ContextEntry, "render">>;
export function isCurrent(onDiskText: string): boolean;
