const IMAGE_SETS = {
  noodle: [
    "https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1200&q=80",
  ],
  sushi: [
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=1200&q=80",
  ],
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1593246049226-ded77bf90326?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
  ],
  coffee: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80",
  ],
  burger: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80",
  ],
  tacos: [
    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=1200&q=80",
  ],
  bbq: [
    "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1529692236671-f1dc923e7468?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1529694157871-3f53f13f89a1?auto=format&fit=crop&w=1200&q=80",
  ],
  bakery: [
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
  ],
  seafood: [
    "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=1200&q=80",
  ],
  generic: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=1200&q=80",
  ],
};

const KEYWORD_GROUPS = [
  { key: "noodle", terms: ["noodle", "noddle", "ramen", "pho", "udon", "soba"] },
  { key: "sushi", terms: ["sushi", "omakase", "sashimi"] },
  { key: "pizza", terms: ["pizza", "pizzeria"] },
  { key: "coffee", terms: ["coffee", "cafe", "espresso", "latte", "tea"] },
  { key: "burger", terms: ["burger", "burgers"] },
  { key: "tacos", terms: ["taco", "taqueria", "mexican"] },
  { key: "bbq", terms: ["bbq", "barbecue", "kbbq", "grill"] },
  { key: "bakery", terms: ["bakery", "bistro", "pastry", "dessert"] },
  { key: "seafood", terms: ["seafood", "fish", "oyster", "shrimp", "crab"] },
];

function hashString(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickSetKey(name = "", cuisineTags = []) {
  const source = `${name} ${(cuisineTags || []).join(" ")}`.toLowerCase();
  const group = KEYWORD_GROUPS.find((g) => g.terms.some((term) => source.includes(term)));
  return group?.key || "generic";
}

export function getRestaurantImageFallback(name = "", cuisineTags = []) {
  const key = pickSetKey(name, cuisineTags);
  const set = IMAGE_SETS[key] || IMAGE_SETS.generic;
  const idx = hashString(`${name}-${(cuisineTags || []).join(",")}`) % set.length;
  return set[idx];
}
