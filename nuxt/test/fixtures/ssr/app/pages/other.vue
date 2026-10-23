<template>
	<main data-testid="other">
		<NuxtLink data-testid="to-index" to="/">Home</NuxtLink>
		<!-- NumberTicker does not forward attrs (inheritAttrs: false): tag a wrapper. -->
		<span data-testid="ticker"><FancyNumberTicker :value="4242" /></span>
		<FancyMarquee data-testid="marquee" :repeat="2">
			<span>alpha</span>
			<span>beta</span>
			<span>gamma</span>
		</FancyMarquee>
	</main>
</template>
