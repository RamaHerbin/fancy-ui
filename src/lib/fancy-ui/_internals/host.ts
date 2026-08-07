/**
 * The two scraps of text that identify a cited document on screen: the host it
 * came from, and the single character that stands in for a favicon.
 *
 * Loading a real favicon would mean a request to the cited site from every
 * reader's browser, which is a tracking beacon nobody asked for and a broken
 * image the moment the site is gone. A letter drawn from the host says the same
 * thing, costs nothing, and cannot fail.
 *
 * Every citation surface — source cards, the collapsed sources pill, search
 * result rows — reads hosts through here, so a `www.` is stripped and a
 * scheme-less fixture is parsed the same way everywhere. Internal: not exported
 * from the package.
 */

/**
 * The host of a URL with any `www.` prefix removed, or an empty string when
 * there is no host to show.
 *
 * `new URL` is the parser of record; the regex behind it only exists for the
 * protocol-relative and scheme-less strings it rejects (`//docs.example.dev/x`,
 * `docs.example.dev/x`), which turn up constantly in hand-written fixtures and
 * in model output.
 *
 * `undefined` is accepted rather than merely typed away: the data reaching these
 * components comes off the wire, where an optional field is a real possibility
 * whatever the interface says.
 */
export function hostOf(url: string | undefined): string {
	if (typeof url !== "string" || url === "") return "";

	try {
		return stripWww(new URL(url).hostname);
	} catch {
		const match = /^(?:[a-z][a-z0-9+.-]*:)?(?:\/\/)?([^/?#\s]+)/i.exec(url);
		if (!match) return "";
		// Whatever is left has to look like a host, or we are just echoing the
		// path of a relative link back at the reader.
		const host = match[1].split("@").pop() as string;
		return host.includes(".") ? stripWww(host) : "";
	}
}

/**
 * The character in a monogram circle: the first letter or digit of the text,
 * upper-cased, falling back to a question mark so the circle is never empty.
 *
 * First letter or digit rather than first character, because a title that opens
 * with a quote or a bullet would otherwise put punctuation in the circle. The
 * `u` flag is what keeps a character outside the BMP whole instead of matching
 * half a surrogate pair.
 */
export function monogram(text: string | undefined): string {
	const match = /[\p{L}\p{N}]/u.exec(text ?? "");
	const upper = (match?.[0] ?? "?").toUpperCase();
	// A few letters upper-case into more than one character — "ß" becomes "SS" —
	// and this has one glyph's worth of room. The original stands in those cases:
	// a lone "ß" reads better than half of "SS".
	return [...upper].length > 1 ? (match?.[0] ?? "?") : upper;
}

function stripWww(host: string): string {
	return host.replace(/^www\./i, "");
}
