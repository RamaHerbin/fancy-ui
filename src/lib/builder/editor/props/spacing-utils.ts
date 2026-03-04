/**
 * Tailwind spacing class parser and builder.
 *
 * Converts between Tailwind class strings (e.g. "py-16 px-4")
 * and a structured { top, right, bottom, left } object.
 */

export interface SpacingValues {
	top: string;
	right: string;
	bottom: string;
	left: string;
}

export const SPACING_SCALE = [
	"0",
	"0.5",
	"1",
	"1.5",
	"2",
	"2.5",
	"3",
	"3.5",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"11",
	"12",
	"14",
	"16",
	"20",
	"24",
	"28",
	"32",
	"36",
	"40",
	"44",
	"48",
	"52",
	"56",
	"60",
	"64",
	"72",
	"80",
	"96",
];

/**
 * Parse a Tailwind spacing class string into individual side values.
 * Supports: p-4, px-4, py-4, pt-4, pr-4, pb-4, pl-4 (and m- equivalents)
 */
export function parseSpacingClasses(classString: string, prefix: "p" | "m"): SpacingValues {
	const result: SpacingValues = { top: "", right: "", bottom: "", left: "" };
	if (!classString) return result;

	const classes = classString.split(/\s+/).filter(Boolean);

	for (const cls of classes) {
		// Match patterns like p-4, px-4, pt-4, etc.
		const allMatch = cls.match(new RegExp(`^${prefix}-(\\S+)$`));
		const xMatch = cls.match(new RegExp(`^${prefix}x-(\\S+)$`));
		const yMatch = cls.match(new RegExp(`^${prefix}y-(\\S+)$`));
		const tMatch = cls.match(new RegExp(`^${prefix}t-(\\S+)$`));
		const rMatch = cls.match(new RegExp(`^${prefix}r-(\\S+)$`));
		const bMatch = cls.match(new RegExp(`^${prefix}b-(\\S+)$`));
		const lMatch = cls.match(new RegExp(`^${prefix}l-(\\S+)$`));

		if (tMatch) result.top = tMatch[1];
		else if (rMatch) result.right = rMatch[1];
		else if (bMatch) result.bottom = bMatch[1];
		else if (lMatch) result.left = lMatch[1];
		else if (xMatch) {
			result.left = xMatch[1];
			result.right = xMatch[1];
		} else if (yMatch) {
			result.top = yMatch[1];
			result.bottom = yMatch[1];
		} else if (allMatch) {
			result.top = allMatch[1];
			result.right = allMatch[1];
			result.bottom = allMatch[1];
			result.left = allMatch[1];
		}
	}

	return result;
}

/**
 * Build a Tailwind spacing class string from individual side values.
 * Automatically uses shorthand when possible (p-4, px-4 py-4, etc.)
 */
export function buildSpacingClasses(values: SpacingValues, prefix: "p" | "m"): string {
	const { top, right, bottom, left } = values;

	// All empty
	if (!top && !right && !bottom && !left) return "";

	// All equal → p-4
	if (top && top === right && top === bottom && top === left) {
		return `${prefix}-${top}`;
	}

	const parts: string[] = [];

	// Check y-axis shorthand
	if (top && top === bottom) {
		parts.push(`${prefix}y-${top}`);
	} else {
		if (top) parts.push(`${prefix}t-${top}`);
		if (bottom) parts.push(`${prefix}b-${bottom}`);
	}

	// Check x-axis shorthand
	if (left && left === right) {
		parts.push(`${prefix}x-${left}`);
	} else {
		if (right) parts.push(`${prefix}r-${right}`);
		if (left) parts.push(`${prefix}l-${left}`);
	}

	return parts.join(" ");
}
