import { render, screen, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import RetroButton from "./RetroButton.svelte";
import Chip from "./Chip.svelte";
import NumChip from "./NumChip.svelte";
import StatusPill from "./StatusPill.svelte";
import RetroTag from "./RetroTag.svelte";
import IconTile from "./IconTile.svelte";
import InlineIndexLabel from "./InlineIndexLabel.svelte";
import PixelGlyph from "./PixelGlyph.svelte";
import Led from "./Led.svelte";
import Swatches from "./Swatches.svelte";
import { ACCENT_TINT, ACCENT_VAR, accentTint, accentVar } from "./accents.js";

const label = (text: string) =>
	createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe("retro-os kit", () => {
	afterEach(cleanup);

	describe("RetroButton", () => {
		it("renders a button by default and an anchor when href is set", () => {
			render(RetroButton, { children: label("Press") });
			expect(screen.getByRole("button", { name: "Press" })).toBeInTheDocument();
			cleanup();

			render(RetroButton, { href: "/docs", children: label("Go") });
			const link = screen.getByRole("link", { name: "Go" });
			expect(link).toHaveAttribute("href", "/docs");
		});

		it("ties the shadow rung to the size, not the variant", () => {
			render(RetroButton, { size: "sm", children: label("S") });
			expect(screen.getByRole("button")).toHaveClass("r-shadow-2");
			cleanup();

			render(RetroButton, { size: "md", variant: "primary", children: label("M") });
			const md = screen.getByRole("button");
			expect(md).toHaveClass("r-shadow-3", "r-pressable", "r-border", "r-pixel");
			// The label is ink on the key's own surface, never the page link color.
			expect(md.getAttribute("style")).toContain("var(--r-btn)");
			expect(md.getAttribute("style")).toContain("color: var(--r-ink)");
		});

		it("appends the pixel glyph only when asked", () => {
			const { container } = render(RetroButton, { pixelGlyph: true, children: label("CTA") });
			expect(container.querySelector(".inline-grid")).toBeInTheDocument();
		});

		it("marks external links as noopener", () => {
			render(RetroButton, { href: "https://example.com", external: true, children: label("Out") });
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	describe("label kit", () => {
		it("Chip flips ink tone to paper text and honors dashed", () => {
			const { container } = render(Chip, { tone: "ink", dashed: true, children: label("NDA") });
			const chip = container.querySelector("span.r-border") as HTMLElement;
			expect(chip.getAttribute("style")).toContain("var(--r-ink)");
			expect(chip.getAttribute("style")).toContain("color: var(--r-paper)");
			expect(chip.getAttribute("style")).toContain("border-style: dashed");
		});

		it("NumChip renders an inverted, borderless ordinal", () => {
			render(NumChip, { label: "01" });
			const chip = screen.getByText("01");
			expect(chip).toHaveClass("r-pixel");
			expect(chip).not.toHaveClass("r-border");
			expect(chip.getAttribute("style")).toContain("var(--r-ink)");
		});

		it("StatusPill paints its required fill", () => {
			const { container } = render(StatusPill, { bg: "var(--r-green)", children: label("LIVE") });
			const pill = container.querySelector(".r-pixel") as HTMLElement;
			expect(pill.getAttribute("style")).toContain("var(--r-green)");
		});

		it("RetroTag defaults to paper and stays mono", () => {
			const { container } = render(RetroTag, { children: label("Svelte 5") });
			const tag = container.querySelector(".r-mono") as HTMLElement;
			expect(tag).toHaveClass("r-border");
			expect(tag.getAttribute("style")).toContain("var(--r-paper)");
		});

		it("IconTile sizes inline so the border eats into the stated size", () => {
			const { container } = render(IconTile, { glyph: "W", bg: "var(--r-tint-blue)", size: 38 });
			const tile = container.querySelector("span") as HTMLElement;
			expect(tile).toHaveClass("box-border", "text-[11px]");
			expect(tile.getAttribute("style")).toContain("width: 38px");
			expect(tile).toHaveAttribute("aria-hidden", "true");
		});

		it("InlineIndexLabel keeps the ordinal outside the label span", () => {
			render(InlineIndexLabel, { index: "02", label: "THE BUILD" });
			expect(screen.getByText(/\(\s*02\s*\)/)).toBeInTheDocument();
			expect(screen.getByText("THE BUILD")).toBeInTheDocument();
		});
	});

	describe("ornaments", () => {
		it("PixelGlyph is a 2×2 grid sized by props, hidden from the tree", () => {
			const { container } = render(PixelGlyph, { cell: 14, gap: 3, pad: 4 });
			const glyph = container.querySelector("span") as HTMLElement;
			expect(glyph).toHaveAttribute("aria-hidden", "true");
			expect(glyph.getAttribute("style")).toContain("repeat(2, 14px)");
			expect(glyph.querySelectorAll("span")).toHaveLength(4);
		});

		it("Led blinks through the class the reduced-motion rule can reach", () => {
			const { container } = render(Led, {});
			const led = container.querySelector("span") as HTMLElement;
			expect(led).toHaveClass("r-blink", "r-border");
			expect(led.getAttribute("style")).toContain("var(--r-green)");
			// No inline animation: cancelling one would need !important.
			expect(led.getAttribute("style")).not.toContain("animation");
		});

		it("Swatches shows all four accents and only presses when interactive", () => {
			const { container } = render(Swatches, {});
			expect(container.querySelectorAll(".r-border")).toHaveLength(4);
			expect(container.querySelector(".r-pressable")).not.toBeInTheDocument();
			cleanup();

			const { container: on } = render(Swatches, { interactive: true });
			expect(on.querySelectorAll(".r-pressable")).toHaveLength(4);
		});
	});

	describe("accent vocabulary", () => {
		it("pairs every accent with its tint", () => {
			for (const accent of ["blue", "rust", "gold", "green"] as const) {
				expect(ACCENT_VAR[accent]).toBe(accentVar(accent));
				expect(ACCENT_TINT[accent]).toBe(accentTint(accent));
				expect(accentVar(accent)).toMatch(/^var\(--r-/);
				expect(accentTint(accent)).toContain("tint");
			}
		});
	});
});
