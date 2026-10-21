/**
 * Chrome strings of the props playground's export block. The catalogs do not
 * carry them yet: the English text is the fallback until the i18n registrar
 * adds the `playground.*` keys, after which `t()` takes over without a change
 * here. The export block itself (framework, install line, code, constraints)
 * is English on purpose: it is read by agents, not translated for people.
 */
import { t } from "$lib/stores";

export const PLAYGROUND_TEXT = {
	"playground.exportTitle": "Code for your agent",
	"playground.exportHint": "Follows the controls and the framework switch. Copy it into a prompt.",
} as const;

export type PlaygroundKey = keyof typeof PLAYGROUND_TEXT;

export const PLAYGROUND_KEYS = Object.keys(PLAYGROUND_TEXT) as PlaygroundKey[];

/** The catalog text for a playground key, or its English fallback while the catalogs lack it. */
export function pt(key: PlaygroundKey): string {
	const translated = (t as unknown as (key: string) => string | undefined)(key);
	return translated ?? PLAYGROUND_TEXT[key];
}
