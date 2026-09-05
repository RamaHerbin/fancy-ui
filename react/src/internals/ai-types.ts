/**
 * Shared data model for the AI component family.
 *
 * Every conversational and agent-activity component reads from these shapes, so
 * one message object can flow from a thread list into a transcript, a tool
 * timeline, or a citation card without translation at each boundary. Types only:
 * nothing here runs, imports, or touches the DOM.
 */

/** Who produced a turn in a conversation. */
export type ChatRole = "user" | "assistant" | "system";

/** Lifecycle of a token stream, from the first chunk to its terminal state. */
export type StreamStatus = "idle" | "streaming" | "done" | "error";

/** Lifecycle of anything the model kicks off and can finish, fail, or abandon. */
export type RunStatus = "pending" | "running" | "done" | "error" | "cancelled";

/** One conversation turn — consumed by message bubbles, transcripts, and branch switchers. */
export interface ChatMessageData {
	id: string;
	role: ChatRole;
	content: string;
	status?: StreamStatus;
	createdAt?: Date | number;
	branchIndex?: number;
	branchCount?: number;
}

/** A single tool invocation — consumed by tool-call cards and their input/output panels. */
export interface ToolCallData {
	id: string;
	name: string;
	status: RunStatus;
	input?: unknown;
	output?: unknown;
	error?: string;
	durationMs?: number;
}

/** A document backing an answer — consumed by source lists and inline citations. */
export interface SourceData {
	id: string;
	title: string;
	url: string;
	snippet?: string;
	domain?: string;
}

/** One hit from a web lookup — consumed by search-result surfaces. */
export interface SearchResultData {
	id: string;
	title: string;
	url: string;
	snippet?: string;
}

/** A file riding along with a turn — consumed by composer attachment chips and previews. */
export interface AttachmentData {
	id: string;
	name: string;
	size?: number;
	type?: string;
	previewUrl?: string;
	progress?: number;
	status?: "uploading" | "done" | "error";
}

/** A node in an agent's plan — consumed by plan trees and task checklists, nests via `substeps`. */
export interface PlanStepData {
	id: string;
	label: string;
	status: RunStatus;
	detail?: string;
	substeps?: PlanStepData[];
}

/** A delegated worker — consumed by subagent cards and fan-out activity views. */
export interface SubagentData {
	id: string;
	name: string;
	task: string;
	status: RunStatus;
	progress?: number;
	model?: string;
}

/** A conversation in the sidebar — consumed by thread lists and history pickers. */
export interface ThreadData {
	id: string;
	title: string;
	preview?: string;
	updatedAt: Date | number;
	unread?: boolean;
}

/** A selectable action — consumed by slash-command menus and command palettes. */
export interface CommandItemData {
	id: string;
	label: string;
	description?: string;
	hint?: string;
}

/** A model the user can switch to — consumed by model pickers in the composer. */
export interface ModelOptionData {
	id: string;
	label: string;
	badge?: string;
	description?: string;
}

/** Context-window consumption — consumed by token meters and context rings. */
export interface TokenUsageData {
	used: number;
	max: number;
	breakdown?: Array<{ label: string; tokens: number }>;
}

/** One line of agent activity — consumed by tool timelines that read as an action log. */
export interface ToolTimelineItemData {
	id: string;
	verb: string;
	target: string;
	detail?: string;
	additions?: number;
	deletions?: number;
	timestamp?: Date | number;
}
