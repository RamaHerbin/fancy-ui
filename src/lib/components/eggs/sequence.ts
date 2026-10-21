export interface KeySequenceMatcher {
	/** Returns true exactly when this key completes the sequence. */
	feed(key: string): boolean;
	reset(): void;
}

/**
 * Case-insensitive key-sequence matcher. On a wrong key it falls back to the
 * longest suffix of what was typed that is still a prefix of the sequence, so
 * "up up up down..." still matches a sequence starting "up up down".
 */
export function createKeySequenceMatcher(keys: readonly string[]): KeySequenceMatcher {
	const target = keys.map((k) => k.toLowerCase());
	let pos = 0;

	function feed(raw: string): boolean {
		if (target.length === 0) return false;
		const key = raw.toLowerCase();
		if (key === target[pos]) {
			pos++;
			if (pos === target.length) {
				pos = 0;
				return true;
			}
			return false;
		}
		const typed = [...target.slice(0, pos), key];
		pos = 0;
		for (let start = 1; start < typed.length; start++) {
			const len = typed.length - start;
			let ok = true;
			for (let i = 0; i < len; i++) {
				if (typed[start + i] !== target[i]) {
					ok = false;
					break;
				}
			}
			if (ok) {
				pos = len;
				break;
			}
		}
		return false;
	}

	return {
		feed,
		reset() {
			pos = 0;
		},
	};
}
