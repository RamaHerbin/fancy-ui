<script lang="ts">
	interface Props {
		img: string;
		name: string;
		username: string;
		body: string;
	}

	let { img, name, username, body }: Props = $props();
</script>

<!-- Nested double frame: a hairline shell holding a hairline inner panel. -->
<figure class="review-card relative flex w-72 shrink-0 flex-col rounded-2xl border p-1">
	<div
		class="review-card-inner relative flex-1 overflow-hidden rounded-[12px] border px-4 pt-3.5 pb-4"
	>
		<span class="review-card-sheen" aria-hidden="true"></span>
		<div class="relative flex items-center gap-3">
			<img src={img} class="review-card-avatar size-8 rounded-full" width="32" height="32" alt="" />
			<div class="flex min-w-0 flex-col leading-tight">
				<span class="review-card-name truncate text-[13px] font-medium tracking-[-0.01em]">
					{name}
				</span>
				<span class="review-card-handle truncate text-[12px]">{username}</span>
			</div>
		</div>
		<blockquote class="review-card-body relative mt-3 text-[13px] leading-relaxed">
			{body}
		</blockquote>
	</div>
</figure>

<style>
	.review-card {
		--_shell: var(--review-card-shell, #f4f4f5);
		--_panel: var(--review-card-panel, #fafafa);
		--_panel-hover: var(--review-card-panel-hover, #ffffff);
		--_line: var(--review-card-line, rgba(0, 0, 0, 0.08));
		--_ink: var(--review-card-ink, #18181b);
		--_muted: var(--review-card-muted, #71717a);
		--_body: var(--review-card-body, #52525b);
		--_lift: rgba(255, 255, 255, 1);
		background: var(--_shell);
		border-color: var(--_line);
		transition:
			border-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
			background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.dark) .review-card {
		--_shell: var(--review-card-shell, #0e0e10);
		--_panel: var(--review-card-panel, #141416);
		--_panel-hover: var(--review-card-panel-hover, #17171a);
		--_line: var(--review-card-line, rgba(255, 255, 255, 0.08));
		--_ink: var(--review-card-ink, #f4f4f5);
		--_muted: var(--review-card-muted, #71717a);
		--_body: var(--review-card-body, #a1a1aa);
		--_lift: rgba(255, 255, 255, 0.1);
	}

	.review-card-inner {
		background: var(--_panel);
		border-color: color-mix(in oklab, var(--_line) 75%, transparent);
		box-shadow: inset 0 1px 0 transparent;
		transition:
			box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1),
			background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Hover: a quiet top-edge highlight, as if the card caught light from above. */
	.review-card:hover .review-card-inner {
		background: var(--_panel-hover);
		box-shadow:
			inset 0 1px 0 var(--_lift),
			0 1px 2px rgba(0, 0, 0, 0.04),
			0 6px 16px -8px rgba(0, 0, 0, 0.1);
	}

	.review-card-sheen {
		position: absolute;
		inset: 0 0 auto 0;
		height: 60%;
		pointer-events: none;
		background: radial-gradient(
			120% 90% at 50% 0%,
			color-mix(in oklab, var(--_lift) 60%, transparent),
			transparent 70%
		);
		opacity: 0;
		transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.review-card:hover .review-card-sheen {
		opacity: 1;
	}

	.review-card-avatar {
		background: var(--_shell);
		box-shadow:
			0 0 0 2px var(--_panel),
			0 0 0 3px var(--_line);
	}

	@media (prefers-reduced-motion: reduce) {
		.review-card,
		.review-card-inner,
		.review-card-sheen {
			transition: none;
		}
	}

	.review-card-name {
		color: var(--_ink);
	}

	.review-card-handle {
		color: var(--_muted);
	}

	.review-card-body {
		color: var(--_body);
	}
</style>
