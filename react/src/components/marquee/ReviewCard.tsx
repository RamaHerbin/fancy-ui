import "./review-card.css";

export interface ReviewCardProps {
	img: string;
	name: string;
	username: string;
	body: string;
}

/** A ready-made card for testimonial-style marquees: a nested double frame,
 * a hairline shell holding a hairline inner panel. */
export function ReviewCard({ img, name, username, body }: ReviewCardProps) {
	return (
		<figure className="review-card relative flex w-72 shrink-0 flex-col rounded-2xl border p-1">
			<div className="review-card-inner relative flex-1 overflow-hidden rounded-[12px] border px-4 pt-3.5 pb-4">
				<span className="review-card-sheen" aria-hidden="true"></span>
				<div className="relative flex items-center gap-3">
					<img
						src={img}
						className="review-card-avatar size-8 rounded-full"
						width="32"
						height="32"
						alt=""
					/>
					<div className="flex min-w-0 flex-col leading-tight">
						<span className="review-card-name truncate text-[13px] font-medium tracking-[-0.01em]">
							{name}
						</span>
						<span className="review-card-handle truncate text-[12px]">{username}</span>
					</div>
				</div>
				<blockquote className="review-card-body relative mt-3 text-[13px] leading-relaxed">
					{body}
				</blockquote>
			</div>
		</figure>
	);
}
