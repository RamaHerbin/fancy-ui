import { describe, expect, it } from "vitest";
import { componentBadges } from "./component-badges.js";
import type { ComponentMeta } from "$lib/types.js";

const base: ComponentMeta = {
	name: "Thing",
	slug: "thing",
	description: "d",
	category: "buttons",
	group: "core",
	status: "done",
};

const ids = (m: ComponentMeta) => componentBadges(m).map((b) => b.id);

describe("componentBadges", () => {
	it("marks a finished component as stable", () => {
		expect(componentBadges(base)).toEqual([
			{ id: "stable", key: "status.stable", tone: "success" },
		]);
	});

	it("maps in-progress and planned to their own chips", () => {
		expect(ids({ ...base, status: "in-progress" })).toEqual(["in-progress"]);
		const planned = componentBadges({ ...base, status: "planned" });
		expect(planned).toEqual([{ id: "planned", key: "status.planned", tone: "neutral" }]);
	});

	it("adds a since chip carrying the version", () => {
		const badges = componentBadges({ ...base, since: "0.12.0" });
		expect(badges.at(-1)).toEqual({
			id: "since",
			key: "comp.sinceVersion",
			vars: { version: "0.12.0" },
			tone: "info",
		});
	});

	it("shows a deprecated chip instead of the status chip", () => {
		const badges = componentBadges({ ...base, deprecated: true, since: "0.1.0" });
		expect(badges.map((b) => b.id)).toEqual(["deprecated", "since"]);
		expect(badges[0]).toMatchObject({ key: "status.deprecated", tone: "danger" });
	});

	it("ignores an empty since", () => {
		expect(ids({ ...base, since: "  " })).toEqual(["stable"]);
	});
});
