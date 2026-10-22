// Types for scripts/lib/i18n-parse.mjs, which the TypeScript quality test imports.

export interface CatalogEntry {
	key: string;
	value: string;
	/** Text of the `@context` comment above the key, or null. */
	context: string | null;
	line: number;
	from: number;
	to: number;
}

export interface ParsedCatalog {
	/** Leading `//` comment line, or "". */
	header: string;
	entries: CatalogEntry[];
	src: string;
}

export interface KeyUsage {
	literals: Map<string, string>;
	prefixes: Map<string, string>;
}

export interface ChromeFinding {
	file: string;
	line: number;
	kind: string;
	text: string;
}

export const repoRoot: string;
export const localesPath: string;
export const messagesDir: string;
export const reviewedDir: string;
export const allowlistPath: string;
export const contextPath: string;
export const appHtmlPath: string;
export const PLURAL_CATEGORIES: string[];
export const REQUIRED_PLURALS: Record<string, string[]>;
export const OPTIONAL_PLURALS: Record<string, string[]>;
export const CHROME_ROOTS: string[];
export const CHROME_EXCLUDED: string[];

export function allowedPlurals(code: string): string[];
export function parseLocales(): { code: string; dir: "ltr" | "rtl" }[];
export function listCatalogFiles(): string[];
export function parseCatalogSource(src: string, file?: string): ParsedCatalog;
export function parseCatalog(code: string): ParsedCatalog;
export function entriesToMap(entries: { key: string; value: string }[]): Record<string, string>;
export function hasDraftHeader(header: string): boolean;
export function splitPluralKey(
	key: string,
	pluralBases: Set<string>
): { base: string; category: string } | null;
export function pluralBasesOf(enEntries: { key: string }[]): Set<string>;
export function walk(dir: string, accept: (file: string) => boolean): Generator<string>;
export function listAppSources(): string[];
export function scanKeyUsage(files?: string[]): KeyUsage;
export function findUsage(key: string, usage: KeyUsage, pluralBases?: Set<string>): string | null;
export function sha1(text: string): string;
export function readAllowlist(): unknown;
export function readManifest(code: string): Record<string, string> | null;
export function manifestPath(code: string): string;
export function pluralSource(base: string, enMap: Record<string, string>): string;
export function expectedManifest(
	code: string,
	enEntries: { key: string; value: string }[],
	catalogEntries: { key: string }[]
): Record<string, string>;
export function looksLikeEnglish(text: string): boolean;
export function scanSvelteSource(src: string): { line: number; kind: string; text: string }[];
export function scanStaticChrome(): ChromeFinding[];
