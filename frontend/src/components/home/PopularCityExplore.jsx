import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";


function exploreHref({ q, city }) {
  const p = new URLSearchParams();
  if (q?.trim()) p.set("q", q.trim());
  if (city?.trim()) p.set("city", city.trim());
  const s = p.toString();
  return s ? `${ROUTES.EXPLORE}?${s}` : ROUTES.EXPLORE;
}

const CITIES = [
  "San Jose",
  "San Francisco",
  "Fremont",
  "Santa Clara",
  "Los Angeles",
  "New York",
  "Chicago",
  "Seattle",
  "Austin",
  "Brooklyn",
];

const CITY_DISPLAY = {
  "San Jose": "San Jose, CA",
  "San Francisco": "San Francisco, CA",
  Fremont: "Fremont, CA",
  "Santa Clara": "Santa Clara, CA",
  "Los Angeles": "Los Angeles, CA",
  "New York": "New York, NY",
  Chicago: "Chicago, IL",
  Seattle: "Seattle, WA",
  Austin: "Austin, TX",
  Brooklyn: "Brooklyn, NY",
};

const CITY_CONTENT = {
  "San Jose": {
    top: [
      "Brunch",
      "Ramen",
      "Pizza",
      "Coffee",
      "Sushi",
      "Tacos",
      "Italian",
      "Indian",
      "Korean BBQ",
      "Vegan",
      "Burgers",
      "Desserts",
    ],
    trending: [
      "Outdoor seating",
      "Late night food",
      "Family friendly",
      "Date night",
      "Cheap eats",
      "Fine dining",
      "Food delivery",
      "Happy hour",
      "Breakfast",
      "Catering",
      "Gluten-free",
      "Halal",
    ],
    recent: [
      "North Park Bistro",
      "Santana Row Ramen",
      "Willow Glen Pizza",
      "Santa Clara Szechuan",
      "Fremont Eats Grill",
      "Sunnyvale Sushi Spot",
      "Mountain View Taco Garden",
      "Palo Alto Coffee & Bagels",
      "Newark Noodle House",
      "San Mateo Deli & Grill",
      "Union City Burger Bar",
      "Livermore Town Grill",
    ],
  },
  "San Francisco": {
    top: [
      "Mission Taqueria",
      "Dim sum",
      "Seafood",
      "Coffee",
      "Brunch",
      "Burritos",
      "Sourdough",
      "Wine bar",
      "Ramen",
      "Vegan",
      "Pizza",
      "Bakery",
    ],
    trending: [
      "Ferry Building",
      "Chinatown",
      "Castro",
      "North Beach",
      "SoMa lunch",
      "Dinner reservations",
      "Rooftop dining",
      "Food trucks",
      "Cocktail bars",
      "Farm to table",
      "Sushi omakase",
      "Korean food",
    ],
    recent: [
      "Mission Taqueria",
      "North Park Bistro",
      "Brooklyn Bridge Sushi",
      "Silver Lake Coffee Lab",
      "Loop Deep Dish",
      "Rainey Street BBQ",
      "Capitol Hill Brunch House",
      "Denver Alpine Bistro",
      "Willow Glen Pizza",
      "Santana Row Ramen",
      "Fremont Eats Grill",
      "Santa Clara Szechuan",
    ],
  },
  Fremont: {
    top: [
      "Korean BBQ",
      "Bob tea",
      "Indian",
      "Pizza",
      "Sushi",
      "Coffee",
      "Pho",
      "Halal",
      "Burgers",
      "Dim sum",
      "Mediterranean",
      "Thai",
    ],
    trending: [
      "Warm Springs",
      "Niles district",
      "Family dinner",
      "Takeout",
      "Late night",
      "Birthday dinner",
      "Cheap lunch",
      "Vegan options",
      "Outdoor patio",
      "Hot pot",
      "Boba",
      "Breakfast",
    ],
    recent: [
      "Fremont Eats Grill",
      "North Park Bistro",
      "Newark Noodle House",
      "Union City Burger Bar",
      "Santa Clara Szechuan",
      "Sunnyvale Sushi Spot",
      "Mountain View Taco Garden",
      "Willow Glen Pizza",
      "Santana Row Ramen",
      "Palo Alto Coffee & Bagels",
      "San Mateo Deli & Grill",
      "Livermore Town Grill",
    ],
  },
  "Santa Clara": {
    top: [
      "Szechuan",
      "Ramen",
      "Coffee",
      "Korean",
      "Sushi",
      "Pizza",
      "Indian",
      "Brunch",
      "Burgers",
      "Vietnamese",
      "Mediterranean",
      "Dessert",
    ],
    trending: [
      "Levi's Stadium area",
      "Great America",
      "Tech campus lunch",
      "Date night",
      "Group dining",
      "Takeout",
      "Spicy food",
      "Noodles",
      "Bubble tea",
      "Fine dining",
      "Happy hour",
      "Breakfast",
    ],
    recent: [
      "Santa Clara Szechuan",
      "Sunnyvale Sushi Spot",
      "North Park Bistro",
      "Mountain View Taco Garden",
      "Fremont Eats Grill",
      "Palo Alto Coffee & Bagels",
      "Willow Glen Pizza",
      "Santana Row Ramen",
      "Newark Noodle House",
      "San Mateo Deli & Grill",
      "Union City Burger Bar",
      "Livermore Town Grill",
    ],
  },
};

function defaultCityBlock(city) {
  return {
    top: [
      "Restaurants",
      "Coffee",
      "Pizza",
      "Sushi",
      "Brunch",
      "Bars",
      "Delivery",
      "Italian",
      "Mexican",
      "Chinese",
      "Thai",
      "Burgers",
    ],
    trending: [
      "Open now",
      "Top rated",
      "Cheap eats",
      "Date night",
      "Family friendly",
      "Outdoor seating",
      "New spots",
      "Late night",
      "Healthy",
      "Vegan",
      "Gluten-free",
      "Happy hour",
    ],
    recent: [
      "North Park Bistro",
      "Santana Row Ramen",
      "Willow Glen Pizza",
      "Mission Taqueria",
      "Silver Lake Coffee Lab",
      "Brooklyn Bridge Sushi",
      "Loop Deep Dish",
      "Rainey Street BBQ",
      "Capitol Hill Brunch House",
      "Denver Alpine Bistro",
      "Fremont Eats Grill",
      "Santa Clara Szechuan",
    ],
  };
}

function getBlock(city) {
  return CITY_CONTENT[city] ?? defaultCityBlock(city);
}

function LinkGrid({ items, city }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2.5 text-sm">
      {items.map((label) => (
        <li key={label}>
          <Link
            to={exploreHref({ q: label, city })}
            className="text-[#0073bb] hover:underline leading-snug"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PopularCityExplore() {
  const [city, setCity] = useState("San Jose");
  const block = useMemo(() => getBlock(city), [city]);
  const cityTitle = CITY_DISPLAY[city] ?? city;

  return (
    <section className="py-14 sm:py-16 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#2d2e2f] tracking-tight">
          Explore searches in popular cities
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[#6e7072]">
          Discover what people are searching for in each city
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              className={`px-3.5 py-2 rounded-md text-sm font-semibold border transition-colors ${
                c === city
                  ? "border-sky-400 bg-sky-50 text-gray-900"
                  : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-12 space-y-14">
          <div>
            <h3 className="text-lg font-bold text-[#2d2e2f] mb-5">
              Top searches in {cityTitle}
            </h3>
            <LinkGrid items={block.top} city={city} />
            <Link
              to={exploreHref({ q: "", city })}
              className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[#0073bb] hover:underline"
            >
              Show more
              <span aria-hidden>▼</span>
            </Link>
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#2d2e2f] mb-5">
              Trending searches in {cityTitle}
            </h3>
            <LinkGrid items={block.trending} city={city} />
            <Link
              to={exploreHref({ q: "", city })}
              className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[#0073bb] hover:underline"
            >
              Show more
              <span aria-hidden>▼</span>
            </Link>
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#2d2e2f] mb-5">Recently reviewed businesses</h3>
            <LinkGrid items={block.recent} city={city} />
            <Link
              to={exploreHref({ q: "", city })}
              className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-[#0073bb] hover:underline"
            >
              Show more
              <span aria-hidden>▼</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
