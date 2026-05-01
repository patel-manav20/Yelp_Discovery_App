import { Link } from "react-router-dom";
import { restaurantYelpPath } from "../../constants/routes";

function priceDots(level) {
  if (!level || level < 1) return null;
  return "$".repeat(Math.min(4, level));
}

function cuisineLine(tags) {
  if (!tags?.length) return null;
  return tags.slice(0, 4).join(" · ");
}

export default function RecommendationCard({ item, reason, className = "" }) {
  const {
    id,
    name,
    city,
    state,
    average_rating,
    review_count,
    price_level,
    cuisine_tags,
    source,
    yelp_business_id,
  } = item;

  const location = state ? `${city}, ${state}` : city;
  const price = priceDots(price_level);
  const cuisines = cuisineLine(cuisine_tags);
  const why =
    reason ||
    (source === "yelp_supplemental"
      ? "Suggested from search results"
      : "Matched your preferences");

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{name}</h4>
        <span className="shrink-0 text-sm font-semibold text-yelp-red">
          {(Number(average_rating) || 0).toFixed(1)} ★
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{why}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
        {price ? <span className="font-medium text-gray-800">{price}</span> : null}
        {cuisines ? (
          <>
            {price ? <span className="text-gray-300">·</span> : null}
            <span className="line-clamp-1">{cuisines}</span>
          </>
        ) : null}
        <span className="text-gray-300">·</span>
        <span>{location}</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {(Number(review_count) || 0).toLocaleString()}{" "}
        {Number(review_count) === 1 ? "review" : "reviews"}
      </p>
    </>
  );

  const cardClass = `block rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-yelp-red/30 transition-all text-left ${className}`;

  if (id != null) {
    return (
      <Link to={`/restaurants/${id}`} className={cardClass}>
        {inner}
        <span className="mt-2 inline-block text-xs font-semibold text-yelp-red">View details →</span>
      </Link>
    );
  }

  if (yelp_business_id != null) {
    return (
      <Link to={restaurantYelpPath(yelp_business_id)} className={cardClass}>
        {inner}
        <span className="mt-2 inline-block text-xs font-semibold text-yelp-red">View details →</span>
      </Link>
    );
  }

  return (
    <div className={`${cardClass} cursor-default opacity-90`}>
      {inner}
      <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 rounded-md px-2 py-1">
        Not saved locally yet — try Explore search for “{name}”.
      </p>
    </div>
  );
}
