export interface ReviewCardProps {
	img: string;
	name: string;
	username: string;
	body: string;
}

/** A ready-made card for testimonial-style marquees. */
export function ReviewCard({ img, name, username, body }: ReviewCardProps) {
	return (
		<figure className="relative w-64 cursor-pointer overflow-hidden rounded-xl border border-gray-950/[.1] bg-gray-950/[.01] p-4 hover:bg-gray-950/[.05] dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]">
			<div className="flex flex-row items-center gap-2">
				<img src={img} className="rounded-full" width="32" height="32" alt="" />
				<div className="flex flex-col">
					<span className="text-sm font-medium dark:text-white">{name}</span>
					<p className="text-xs font-medium dark:text-white/40">{username}</p>
				</div>
			</div>
			<blockquote className="mt-2 text-sm">{body}</blockquote>
		</figure>
	);
}
