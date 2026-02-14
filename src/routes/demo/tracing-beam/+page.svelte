<script lang="ts">
	import { TracingBeam } from '$lib/fancy-ui/tracing-beam';
</script>

<svelte:head>
	<title>TracingBeam - FancyUI</title>
</svelte:head>

<div class="container mx-auto py-12 px-4">
	<h1 class="text-3xl font-bold mb-2">TracingBeam</h1>
	<p class="text-muted-foreground mb-8">Vertical SVG beam that highlights scroll progress alongside content.</p>

	<section class="mb-12">
		<TracingBeam>
			<div class="space-y-16 pl-8 max-w-2xl">
				<div>
					<span class="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2 block">Step 1</span>
					<h2 class="text-xl font-semibold mb-3">Getting Started</h2>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
					</p>
					<p class="text-muted-foreground leading-relaxed">
						Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
					</p>
				</div>

				<div>
					<span class="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-2 block">Step 2</span>
					<h2 class="text-xl font-semibold mb-3">Configuration</h2>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
					</p>
					<div class="rounded-lg border bg-card p-4 mb-4">
						<code class="text-sm text-muted-foreground">
							&lt;TracingBeam&gt;<br />
							&nbsp;&nbsp;&lt;div&gt;Your content here&lt;/div&gt;<br />
							&lt;/TracingBeam&gt;
						</code>
					</div>
					<p class="text-muted-foreground leading-relaxed">
						Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.
					</p>
				</div>

				<div>
					<span class="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2 block">Step 3</span>
					<h2 class="text-xl font-semibold mb-3">Advanced Usage</h2>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur? At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum.
					</p>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.
					</p>
					<p class="text-muted-foreground leading-relaxed">
						Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet.
					</p>
				</div>

				<div>
					<span class="text-xs font-semibold uppercase tracking-wider text-pink-500 mb-2 block">Step 4</span>
					<h2 class="text-xl font-semibold mb-3">Customization</h2>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Hanc ego cum teneam sententiam, quid est cur verear ne ad eam non possim accommodare.
					</p>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Nostros nisi aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
					</p>
					<p class="text-muted-foreground leading-relaxed">
						Ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Itaque earum rerum hic tenetur a sapiente delectus. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.
					</p>
				</div>

				<div>
					<span class="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2 block">Step 5</span>
					<h2 class="text-xl font-semibold mb-3">Wrapping Up</h2>
					<p class="text-muted-foreground leading-relaxed mb-4">
						Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
					</p>
					<p class="text-muted-foreground leading-relaxed">
						Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.
					</p>
				</div>
			</div>
		</TracingBeam>
	</section>
</div>
