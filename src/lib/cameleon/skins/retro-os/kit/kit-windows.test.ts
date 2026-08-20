import { render, screen, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import SectionWindow from "./SectionWindow.svelte";
import AppWindow from "./AppWindow.svelte";
import NotchedFrame from "./NotchedFrame.svelte";
import RetroCard from "./RetroCard.svelte";
import VideoFrame from "./VideoFrame.svelte";
import PlayBadge from "./PlayBadge.svelte";
import EmptyMediaFrame from "./EmptyMediaFrame.svelte";
import HeaderBar from "./HeaderBar.svelte";

const text = (t: string) => createRawSnippet(() => ({ render: () => `<span>${t}</span>` }));

describe("retro-os kit — windows, media, chrome", () => {
	afterEach(cleanup);

	describe("SectionWindow", () => {
		it("renders the title, index and DOS label, and paints the accent dot", () => {
			const { container } = render(SectionWindow, {
				index: "01",
				title: "CONNECT",
				dosLabel: "SUMMARY.EXE",
				accent: "blue",
				children: text("body"),
			});
			expect(screen.getByText("CONNECT")).toBeInTheDocument();
			expect(screen.getByText("/ 01")).toBeInTheDocument();
			expect(screen.getByText("SUMMARY.EXE")).toBeInTheDocument();
			const dot = container.querySelector(".r-window-dot") as HTMLElement;
			expect(dot.getAttribute("style")).toContain("var(--r-blue)");
		});

		it("formats the index in parens when indexStyle is paren", () => {
			render(SectionWindow, {
				index: "02",
				indexStyle: "paren",
				title: "BRIEF",
				dosLabel: "BRIEF.EXE",
				accent: "rust",
				children: text("body"),
			});
			expect(screen.getByText("( 02 )")).toBeInTheDocument();
		});
	});

	describe("AppWindow", () => {
		it("renders the filename and two aria-hidden control boxes with no shadow class by default", () => {
			const { container } = render(AppWindow, { filename: "photo.jpg", children: text("body") });
			expect(screen.getByText("photo.jpg")).toBeInTheDocument();
			const controls = container.querySelectorAll(".r-app-btn[aria-hidden='true']");
			expect(controls).toHaveLength(2);
			const win = container.querySelector(".r-app") as HTMLElement;
			expect(win).not.toHaveClass("r-shadow-4");
		});
	});

	describe("NotchedFrame", () => {
		it("builds the three nested layers and passes shadow into the inline custom property", () => {
			const { container } = render(NotchedFrame, { shadow: 4, children: text("body") });
			const carrier = container.querySelector(".r-notched") as HTMLElement;
			const ink = carrier.querySelector(".r-notched-ink") as HTMLElement;
			const paper = ink.querySelector(".r-notched-paper") as HTMLElement;
			expect(carrier).toBeInTheDocument();
			expect(ink).toBeInTheDocument();
			expect(paper).toBeInTheDocument();
			expect(carrier.getAttribute("style")).toContain("--r-notch-shadow: 4px");
		});
	});

	describe("RetroCard", () => {
		it("becomes an <a> with href, carries both custom properties and preserves caller style", () => {
			const { container } = render(RetroCard, {
				href: "/work/x",
				accent: "gold",
				bg: "var(--r-tint-gold)",
				style: "margin-top: 4px;",
				children: text("body"),
			});
			const card = container.querySelector("a.r-card") as HTMLElement;
			expect(card).toHaveAttribute("href", "/work/x");
			const style = card.getAttribute("style") ?? "";
			expect(style).toContain("--r-card-bg: var(--r-tint-gold)");
			expect(style).toContain("--r-card-hover: var(--r-gold)");
			expect(style).toContain("margin-top: 4px");
		});

		it("renders a <div> when href is absent", () => {
			const { container } = render(RetroCard, { children: text("body") });
			expect(container.querySelector("div.r-card")).toBeInTheDocument();
			expect(container.querySelector("a.r-card")).not.toBeInTheDocument();
		});
	});

	describe("VideoFrame", () => {
		it("renders a button when onOpen is set, and a plain stage otherwise", () => {
			const { container } = render(VideoFrame, {
				poster: "/poster.jpg",
				fileLabel: "DEMO.MP4",
				duration: "01:31",
				onOpen: () => {},
			});
			expect(container.querySelector("button.r-vframe-stage")).toBeInTheDocument();
			cleanup();

			const { container: c2 } = render(VideoFrame, {
				poster: "/poster.jpg",
				fileLabel: "DEMO.MP4",
				duration: "01:31",
			});
			expect(c2.querySelector("button.r-vframe-stage")).not.toBeInTheDocument();
			expect(c2.querySelector("div.r-vframe-stage")).toBeInTheDocument();
		});

		it("applies the lg stage/shadow classes only for size='lg'", () => {
			const { container } = render(VideoFrame, {
				poster: "/poster.jpg",
				fileLabel: "DEMO.MP4",
				duration: "01:31",
				size: "sm",
			});
			const sm = container.querySelector(".r-vframe") as HTMLElement;
			expect(sm).not.toHaveClass("r-vframe-lg", "r-shadow-4");
			cleanup();

			const { container: c2 } = render(VideoFrame, {
				poster: "/poster.jpg",
				fileLabel: "DEMO.MP4",
				duration: "01:31",
				size: "lg",
				badge: "FULL DEMO",
			});
			const lg = c2.querySelector(".r-vframe") as HTMLElement;
			expect(lg).toHaveClass("r-vframe-lg", "r-shadow-4");
			expect(screen.getByText("FULL DEMO")).toBeInTheDocument();
		});
	});

	describe("PlayBadge", () => {
		it("scales the shadow rung and glyph size with size=60", () => {
			const { container } = render(PlayBadge, { size: 60 });
			const badge = container.querySelector(".r-play") as HTMLElement;
			const style = badge.getAttribute("style") ?? "";
			expect(style).toContain("--r-play-size: 60px");
			expect(style).toContain("--r-play-shadow: 4px");
			expect(style).toContain("--r-play-glyph: 20px");
		});

		it("defaults to the 44px/3px rung", () => {
			const { container } = render(PlayBadge, {});
			const badge = container.querySelector(".r-play") as HTMLElement;
			const style = badge.getAttribute("style") ?? "";
			expect(style).toContain("--r-play-size: 44px");
			expect(style).toContain("--r-play-shadow: 3px");
		});
	});

	describe("EmptyMediaFrame", () => {
		it("renders a dashed frame and the label", () => {
			const { container } = render(EmptyMediaFrame, { label: "DEMO IN PREPARATION" });
			const frame = container.querySelector(".r-empty") as HTMLElement;
			expect(frame).toBeInTheDocument();
			expect(screen.getByText("DEMO IN PREPARATION")).toBeInTheDocument();
		});
	});

	describe("HeaderBar", () => {
		it("renders the title and the children slot content on the right", () => {
			render(HeaderBar, { title: "Retro OS", subtitle: "kit demo", children: text("Switch") });
			expect(screen.getByText("Retro OS")).toBeInTheDocument();
			expect(screen.getByText("kit demo")).toBeInTheDocument();
			expect(screen.getByText("Switch")).toBeInTheDocument();
		});
	});
});
