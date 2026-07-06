/**
 * Locale registry for the docs site.
 *
 * Adding a language: add an entry here and drop a matching
 * `src/lib/i18n/messages/<code>.ts` catalog (and per-page `.svx` prose files).
 */

export type Dir = "ltr" | "rtl";

export interface LocaleDef {
	/** BCP-47 code, also the message-catalog filename. */
	code: string;
	/** English name. */
	label: string;
	/** Endonym (name in its own language). */
	native: string;
	/** Text direction. */
	dir: Dir;
}

export const locales: LocaleDef[] = [
	{ code: "en", label: "English", native: "English", dir: "ltr" },
	{ code: "fr", label: "French", native: "Français", dir: "ltr" },
	{ code: "es", label: "Spanish", native: "Español", dir: "ltr" },
	{ code: "de", label: "German", native: "Deutsch", dir: "ltr" },
	{ code: "it", label: "Italian", native: "Italiano", dir: "ltr" },
	{ code: "pt", label: "Portuguese", native: "Português", dir: "ltr" },
	{ code: "pl", label: "Polish", native: "Polski", dir: "ltr" },
	{ code: "cs", label: "Czech", native: "Čeština", dir: "ltr" },
	{ code: "ja", label: "Japanese", native: "日本語", dir: "ltr" },
	{ code: "ko", label: "Korean", native: "한국어", dir: "ltr" },
	{ code: "zh-Hans", label: "Chinese", native: "简体中文", dir: "ltr" },
	{ code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
	{ code: "id", label: "Indonesian", native: "Bahasa Indonesia", dir: "ltr" },
	{ code: "tr", label: "Turkish", native: "Türkçe", dir: "ltr" },
	{ code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
	{ code: "fa", label: "Persian", native: "فارسی", dir: "rtl" },
];

export const defaultLocale = "en";

const byCode = new Map(locales.map((l) => [l.code, l]));

export function getLocaleDef(code: string): LocaleDef | undefined {
	return byCode.get(code);
}

/** Short uppercase badge for the switcher (e.g. "EN", "ZH"). */
export function localeBadge(code: string): string {
	return code.slice(0, 2).toUpperCase();
}
