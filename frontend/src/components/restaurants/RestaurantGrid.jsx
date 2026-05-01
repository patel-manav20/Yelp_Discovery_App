import RestaurantCard from "./RestaurantCard";
import YelpRestaurantRow from "./YelpRestaurantRow";

function safeDomId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export default function RestaurantGrid({
  restaurants = [],
  getCardProps,
  className = "",
  variant = "card",
  highlightedId = null,
  onRowHover,
  rowIdPrefix = "explore-restaurant",
}) {
  if (!restaurants.length) {
    return null;
  }

  const Row = variant === "yelp" ? YelpRestaurantRow : RestaurantCard;

  return (
    <ul
      className={`flex flex-col gap-0 ${variant === "yelp" ? "" : "gap-3 sm:gap-4"} ${className}`}
      role="list"
    >
      {restaurants.map((restaurant, index) => {
        const extra = getCardProps?.(restaurant) ?? {};
        return (
          <li
            key={restaurant.id}
            id={rowIdPrefix ? `${rowIdPrefix}-${safeDomId(restaurant.id)}` : undefined}
            className={variant === "yelp" ? "scroll-mt-3" : undefined}
          >
            {variant === "yelp" ? (
              <Row
                restaurant={restaurant}
                listIndex={index}
                isHighlighted={highlightedId === restaurant.id}
                onHover={onRowHover}
                sponsored={index < 2}
              />
            ) : (
              <Row restaurant={restaurant} {...extra} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
