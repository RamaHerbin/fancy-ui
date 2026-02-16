<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		img: string;
		name: string;
		username: string;
		body: string;
		linkedinUrl: string;
		class?: string;
	}

	let { img, name, username, body, linkedinUrl, class: className }: Props = $props();
</script>

<a
	href={linkedinUrl}
	target="_blank"
	rel="noopener noreferrer"
	class={cn(
		'relative w-88 cursor-pointer overflow-hidden rounded-xl border p-4 transition-all duration-300 block',
		'border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]',
		'dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]',
		className
	)}
>
	<figure class="w-full h-full">
		<div class="flex flex-row items-center gap-2">
			<img
				class="rounded-full w-8 h-8 object-cover"
				width="32"
				height="32"
				alt={`Profile picture of ${name}`}
				src={img}
			/>
			<div class="flex flex-col">
				<div class="text-sm font-medium dark:text-white">{name}</div>
				<p class="text-xs font-medium dark:text-white/60">{username}</p>
			</div>
		</div>
		<blockquote class="mt-2 text-sm">{body}</blockquote>
		<figcaption class="sr-only">Review by {name}</figcaption>
	</figure>
</a>
