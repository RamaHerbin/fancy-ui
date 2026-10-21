/**
 * Pure rules behind Avatar, shared byte for byte by the Svelte, React and Vue
 * packages so the same name gives the same initials and the same colour in all
 * three, on the server and in the browser.
 *
 * Nothing here touches the DOM, a timer or a random source.
 */

export type AvatarStatus = "loading" | "loaded" | "fallback";

/**
 * Soft tinted pairs for the initials fallback. Each entry is a complete static
 * class string on purpose: Tailwind finds a class by scanning the shipped
 * source, so a name built from a variable (`bg-${hue}-500/15`) would never be
 * generated.
 */
export const AVATAR_TONES: readonly string[] = [
	"bg-rose-500/15 text-rose-800 dark:text-rose-300",
	"bg-orange-500/15 text-orange-800 dark:text-orange-300",
	"bg-amber-500/15 text-amber-800 dark:text-amber-300",
	"bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
	"bg-teal-500/15 text-teal-800 dark:text-teal-300",
	"bg-sky-500/15 text-sky-800 dark:text-sky-300",
	"bg-violet-500/15 text-violet-800 dark:text-violet-300",
	"bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300",
];

/** Used when there is nothing to take initials from. */
export const AVATAR_NEUTRAL_TONE = "bg-muted text-muted-foreground";

/** The first letter or digit of a word, as a whole code point. */
const WORD_START = /[\p{L}\p{N}]/u;

/**
 * One or two letters for a name: the first letter of the first word and of the
 * last word, upper-cased, or a single letter for a one-word name. Leading
 * punctuation is skipped, and a name with no letter or digit gives "".
 */
export function initialsOf(name: string | null | undefined): string {
	if (!name) return "";
	const firsts: string[] = [];
	for (const word of name.normalize("NFC").trim().split(/\s+/)) {
		const first = WORD_START.exec(word)?.[0];
		if (first) firsts.push(first);
	}
	const first = firsts[0];
	const last = firsts[firsts.length - 1];
	if (first === undefined || last === undefined) return "";
	return (firsts.length === 1 ? first : first + last).toUpperCase();
}

/** Case, Unicode composition and runs of spaces never change a colour. */
function keyOf(name: string): string {
	return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** A stable index in `[0, count)` for a name (a small multiplicative hash). */
export function toneIndexOf(name: string, count: number = AVATAR_TONES.length): number {
	let hash = 5381;
	for (const char of keyOf(name)) {
		hash = (Math.imul(hash, 33) ^ (char.codePointAt(0) ?? 0)) >>> 0;
	}
	return hash % count;
}

/** The class pair for a name's fallback: a palette entry, or the neutral one. */
export function avatarToneClass(name: string | null | undefined): string {
	if (!name || initialsOf(name) === "") return AVATAR_NEUTRAL_TONE;
	return AVATAR_TONES[toneIndexOf(name)] ?? AVATAR_NEUTRAL_TONE;
}

/**
 * Where an image is, given the last `src` that loaded and the last that
 * failed. Keeping the two sources instead of a flag means a new `src` is
 * "loading" again with no reset step, and a server render agrees with the
 * first client render.
 */
export function resolveAvatarStatus(
	src: string | null | undefined,
	loadedSrc: string | null,
	failedSrc: string | null
): AvatarStatus {
	if (!src) return "fallback";
	if (failedSrc === src) return "fallback";
	if (loadedSrc === src) return "loaded";
	return "loading";
}

/**
 * The accessible name, or undefined when the avatar is decorative: `alt` wins
 * (so `alt=""` is the explicit opt-out), then `name`; blank text counts as no
 * text.
 */
export function accessibleName(
	alt: string | null | undefined,
	name: string | null | undefined
): string | undefined {
	const label = (alt ?? name)?.trim();
	return label ? label : undefined;
}
