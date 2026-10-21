import { describe, expect, it } from "vitest";
import {
	AVATAR_NEUTRAL_TONE,
	AVATAR_TONES,
	accessibleName,
	avatarToneClass,
	initialsOf,
	resolveAvatarStatus,
	toneIndexOf,
} from "./avatar-core.js";

describe("initialsOf", () => {
	it("takes the first letter of the first and the last word, upper-cased", () => {
		expect(initialsOf("Maya Okafor")).toBe("MO");
		expect(initialsOf("jean luc picard")).toBe("JP");
		expect(initialsOf("  ada   lovelace  ")).toBe("AL");
	});

	it("gives one letter for a single word", () => {
		expect(initialsOf("Cher")).toBe("C");
	});

	it("never gives more than two letters", () => {
		expect(initialsOf("A B C D E")).toBe("AE");
	});

	it("skips leading punctuation and keeps non-latin letters whole", () => {
		expect(initialsOf("@maya")).toBe("M");
		expect(initialsOf("(Dr.) Ana Souza")).toBe("DS");
		expect(initialsOf("李 小龍")).toBe("李小");
		expect(initialsOf("élodie dupont")).toBe("ÉD");
	});

	it("is empty when the name has no letter or digit", () => {
		expect(initialsOf("")).toBe("");
		expect(initialsOf("   ")).toBe("");
		expect(initialsOf("•••")).toBe("");
		expect(initialsOf(undefined)).toBe("");
		expect(initialsOf(null)).toBe("");
	});
});

describe("toneIndexOf and avatarToneClass", () => {
	it("is deterministic and ignores case and spacing", () => {
		expect(toneIndexOf("Maya Okafor")).toBe(toneIndexOf("Maya Okafor"));
		expect(toneIndexOf("Maya Okafor")).toBe(toneIndexOf("  maya   OKAFOR "));
	});

	it("always lands inside the palette", () => {
		for (const name of ["a", "b", "Zoë", "李小龍", "x".repeat(500), "🙂 smile"]) {
			const index = toneIndexOf(name);
			expect(Number.isInteger(index)).toBe(true);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(AVATAR_TONES.length);
		}
	});

	it("spreads a realistic set of names over most of the palette", () => {
		const names = [
			"Maya Okafor",
			"Lena Fischer",
			"Tomás Rivera",
			"Aiko Tanaka",
			"Noor Haddad",
			"Sam Patel",
			"Ingrid Larsen",
			"Kofi Mensah",
			"Priya Nair",
			"Jonas Weber",
			"Chloé Martin",
			"Omar Said",
		];
		const seen = new Set(names.map((n) => avatarToneClass(n)));
		expect(seen.size).toBeGreaterThanOrEqual(5);
	});

	it("uses the neutral tone when there is nothing to take initials from", () => {
		expect(avatarToneClass(undefined)).toBe(AVATAR_NEUTRAL_TONE);
		expect(avatarToneClass("•••")).toBe(AVATAR_NEUTRAL_TONE);
		expect(AVATAR_TONES).not.toContain(AVATAR_NEUTRAL_TONE);
	});

	it("keeps every palette entry a distinct static class string", () => {
		expect(new Set(AVATAR_TONES).size).toBe(AVATAR_TONES.length);
		for (const tone of AVATAR_TONES) expect(tone).toMatch(/^bg-[a-z]+-500\/15 text-/);
	});
});

describe("resolveAvatarStatus", () => {
	it("is fallback without a src", () => {
		expect(resolveAvatarStatus(undefined, null, null)).toBe("fallback");
		expect(resolveAvatarStatus("", null, null)).toBe("fallback");
	});

	it("is loading until this exact src reports", () => {
		expect(resolveAvatarStatus("a.png", null, null)).toBe("loading");
		expect(resolveAvatarStatus("b.png", "a.png", null)).toBe("loading");
		expect(resolveAvatarStatus("b.png", null, "a.png")).toBe("loading");
	});

	it("is loaded or fallback once the current src reported", () => {
		expect(resolveAvatarStatus("a.png", "a.png", null)).toBe("loaded");
		expect(resolveAvatarStatus("a.png", null, "a.png")).toBe("fallback");
	});
});

describe("accessibleName", () => {
	it("prefers alt, then name", () => {
		expect(accessibleName("Profile photo", "Maya")).toBe("Profile photo");
		expect(accessibleName(undefined, "Maya")).toBe("Maya");
	});

	it('is undefined (decorative) for alt="", blank text, or nothing at all', () => {
		expect(accessibleName("", "Maya")).toBeUndefined();
		expect(accessibleName("   ", "Maya")).toBeUndefined();
		expect(accessibleName(undefined, undefined)).toBeUndefined();
		expect(accessibleName(undefined, "  ")).toBeUndefined();
	});
});
