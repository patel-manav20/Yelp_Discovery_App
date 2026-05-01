import RatingStars from "../reviews/RatingStars";
import { getRestaurantImageFallback } from "../../utils/restaurantImage";

function priceDots(level) {
  if (!level || level < 1) return null;
  return "$".repeat(Math.min(4, level));
}

export default function RestaurantHero({
  name,
  average_rating,
  review_count,
  price_level,
  cuisine_tags = [],
  mainImageUrl,
  isClaimed = false,
  quickFacts = [],
  className = "",
}) {
  const img = mainImageUrl || getRestaurantImageFallback(name, cuisine_tags);
  const cuisines = cuisine_tags?.length ? cuisine_tags.join(", ") : null;

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 bg-white shadow-card ${className}`}>
      <div className="relative h-52 sm:h-60 md:h-72 lg:h-80 bg-gray-900">
        <img
          src={img}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 md:px-8 pb-5 pt-12 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isClaimed ? (
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/20">
                Claimed
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.35rem] font-bold tracking-tight drop-shadow-md leading-tight text-white">
            {name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RatingStars
              rating={average_rating}
              size="md"
              showNumber
              reviewCount={review_count}
              variant="light"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface-subtle px-4 py-3.5 sm:px-6 md:px-8 border-t border-gray-200/80 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {priceDots(price_level) ? (
          <div className="min-w-[4rem]">
            <span className="text-gray-500 font-semibold text-xs uppercase tracking-wide block mb-0.5">
              Price range
            </span>
            <p className="font-bold text-gray-900">{priceDots(price_level)}</p>
          </div>
        ) : null}
        {cuisines ? (
          <div className="min-w-0 flex-1">
            <span className="text-gray-500 font-semibold text-xs uppercase tracking-wide block mb-0.5">
              Categories
            </span>
            <p className="font-semibold text-gray-900 leading-snug">{cuisines}</p>
          </div>
        ) : null}
        {quickFacts.map((fact, i) => (
          <div key={i} className="min-w-0 max-w-[14rem]">
            <span className="text-gray-500 font-semibold text-xs uppercase tracking-wide block mb-0.5">
              {fact.label}
            </span>
            <p className="font-semibold text-gray-900 truncate">{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
