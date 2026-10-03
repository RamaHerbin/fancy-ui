import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "excalidraw-arrow-binding",
	slug: "excalidraw-arrow-binding",
	origin: "external",
	title: "Whiteboard — arrow binding",
	summary:
		"Drag an arrow near a shape and the shape lights up: release, and the arrow is attached.",
	kind: "interaction",
	creator: "Excalidraw",
	product: "Excalidraw",
	sourceUrl: "https://excalidraw.com/",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["drag"],
	styleTags: ["playful", "minimal"],
	useCaseTags: ["media", "data"],
	sourceFramework: "react",
	implementationFrameworks: ["react"],
	codeAvailability: "open-source",
	analysis: {
		why: "While an arrow is being drawn, the shape under its tip gets a soft blue outline: the canvas announces the connection before you commit. Once bound, moving either shape drags the arrow's end with it. The hand-drawn stroke keeps the whole canvas feeling like a sketch, so rough diagrams read as drafts.",
		whenToUse:
			"Diagram and flow editors, node canvases, any tool where links between objects must survive moves.",
		watch:
			"Binding by proximity needs an escape (a modifier key) for the times you do not want it. The highlight is colour only; pair it with a shape change for low vision. Canvas content needs a text alternative.",
		clues: [
			"hit test against shape outlines",
			"preview outline before commit",
			"store binding, recompute on move",
			"seeded rough strokes",
		],
	},
	curatedRank: 41,
	components: [
		{
			slug: "animated-beam",
			relation: "related",
			note: "Draws a lit path between two fixed nodes; nothing is drawn or attached by the visitor.",
		},
	],
	media: {
		type: "image",
		src: "/inspiration/external/excalidraw-arrow-binding.webp",
		width: 720,
		height: 450,
		alt: "A dark sketch canvas: a hand-drawn rectangle labelled draft, an arrow being dragged from it, and an ellipse outlined in blue where the arrow will attach.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/excalidraw/excalidraw/blob/master/LICENSE",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
