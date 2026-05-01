import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROUTES } from "../../constants/routes";
import { exploreWithQuery, HOME_TOP_CATEGORIES, EXPLORE_CATEGORY_ROW } from "../../constants/homeNav";
import SearchBar from "../search/SearchBar";
import yelpLogoBrand from "../../assets/yelp-logo-brand.png";
import yelpLogoHomeWhite from "../../assets/yelp-logo-white-clean.png";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === ROUTES.HOME;
  const isExplore = location.pathname === ROUTES.EXPLORE;
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [locationInput, setLocationInput] = useState(searchParams.get("city") || "");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
    setLocationInput(searchParams.get("city") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (locationInput.trim()) params.set("city", locationInput.trim());
    navigate(`${ROUTES.EXPLORE}?${params.toString()}`);
    setMobileSearchOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
    setMobileSearchOpen(false);
  };

  const navLink =
    "text-sm font-semibold text-white/95 hover:text-white transition-colors py-1 whitespace-nowrap";
  const navLinkActive = "text-white";
  const headerSurface = isHome
    ? scrolled
      ? "fixed top-0 left-0 right-0 z-50 border-b border-yelp-red-hover/60 bg-yelp-red shadow-nav transition-colors duration-300"
      : "fixed top-0 left-0 right-0 z-50 border-b border-transparent bg-transparent shadow-none transition-colors duration-300"
    : "sticky top-0 z-50 border-b border-yelp-red-hover/60 bg-yelp-red shadow-nav";

  const redHeader = !isHome || scrolled;
  const useIconSearch = redHeader;
  const searchFindPh = "Explore Restaurant, Cafe, Bar";
  const searchLocPh = "San Jose, CA";

  return (
    <header className={headerSurface}>
      <div
        className={
          isExplore
            ? "w-full max-w-none mx-auto px-4 sm:px-5 lg:px-6"
            : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        }
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-h-[3.5rem] md:min-h-[4.25rem] py-2 md:py-2">
          <Link
            to={ROUTES.HOME}
            className="shrink-0 flex items-center py-0.5 pr-1 -ml-0.5 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:rounded-md"
            aria-label="Home — Yelp-style restaurant directory (student project)"
          >
            <img
              src={isHome ? yelpLogoHomeWhite : yelpLogoBrand}
              alt="Yelp"
              className="h-11 w-auto sm:h-12 md:h-14 max-h-14 object-contain object-left"
            />
          </Link>

          <div className="flex md:hidden flex-1 min-w-0 justify-end items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isAuthenticated ? (
              <>
                <Link to={ROUTES.FAVORITES} className={`shrink-0 px-2 py-1.5 text-xs rounded-md ${navLink}`}>
                  Saved
                </Link>
              </>
            ) : (
              <Link
                to={ROUTES.EXPLORE}
                className={`shrink-0 px-2 py-1.5 text-xs font-semibold rounded-md ${navLink} ${navLinkActive}`}
              >
                Explore
              </Link>
            )}
          </div>

          <div className="hidden md:flex flex-1 justify-center px-2 lg:px-8 min-w-0 max-w-4xl mx-auto">
            <SearchBar
              searchTerm={searchTerm}
              location={locationInput}
              onSearchTermChange={setSearchTerm}
              onLocationChange={setLocationInput}
              onSubmit={handleSubmit}
              variant={isHome && !scrolled ? "overlay" : "default"}
              iconSubmit={useIconSearch}
              findPlaceholder={searchFindPh}
              locationPlaceholder={searchLocPh}
            />
          </div>

          <nav className="hidden md:flex items-center gap-x-3 lg:gap-x-4 shrink-0">
            <div className="hidden lg:flex items-center gap-x-2 text-sm">
              <Link
                to={
                  isAuthenticated && user?.role === "owner"
                    ? ROUTES.OWNER_DASHBOARD
                    : ROUTES.OWNER_SIGNUP
                }
                className="font-semibold text-white/95 hover:text-white whitespace-nowrap"
              >
                Yelp for business
              </Link>
              <span className="text-white/55 text-xs select-none" aria-hidden>
                ▾
              </span>
              <Link
                to={ROUTES.WRITE_REVIEW}
                className="font-semibold text-white/95 hover:text-white whitespace-nowrap"
              >
                Write a review
              </Link>
              <span className="text-white/60 text-sm leading-none select-none" aria-hidden>
                •
              </span>
            </div>
            {isAuthenticated ? (
              user?.role === "owner" ? (
                <>
                  <Link to={ROUTES.FAVORITES} className={navLink}>
                    Saved
                  </Link>
                </>
              ) : (
                <Link to={ROUTES.FAVORITES} className={navLink}>
                  Saved
                </Link>
              )
            ) : null}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="md:hidden p-2.5 rounded-md border border-white/40 text-white hover:bg-white/15 transition-colors"
              aria-expanded={mobileSearchOpen}
              aria-controls="mobile-search-panel"
              onClick={() => setMobileSearchOpen((o) => !o)}
            >
              <span className="sr-only">Toggle search</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.PROFILE}
                  className="sm:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white hover:bg-white/30 transition-colors border border-white/40"
                  title="Profile"
                  aria-label="Profile"
                >
                  {(user?.display_name || user?.email || "?").trim().charAt(0).toUpperCase()}
                </Link>
                <Link
                  to={ROUTES.PROFILE}
                  className="hidden sm:inline-flex items-center max-w-[140px] truncate text-sm text-white hover:text-white/90 font-semibold px-1 transition-colors"
                >
                  {user?.display_name}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 sm:px-4 py-2 rounded-md text-yelp-red text-sm font-semibold bg-white border border-gray-300 hover:bg-gray-100 shadow-sm transition-colors"
                >
                  Log out
                </button>
                {user?.role === "owner" ? (
                  <Link
                    to={ROUTES.OWNER_DASHBOARD}
                    className="px-3 sm:px-4 py-2 rounded-md text-yelp-red text-sm font-semibold bg-white border border-gray-300 hover:bg-gray-100 shadow-sm transition-colors"
                  >
                    Dashboard
                  </Link>
                ) : null}
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="px-3 sm:px-4 py-2 rounded-md text-sm font-semibold bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 shadow-sm transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  className="inline-flex px-3 sm:px-4 py-2 rounded-md bg-yelp-red text-white text-sm font-semibold hover:bg-yelp-red-hover border border-yelp-red transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        <div
          id="mobile-search-panel"
          className={`md:hidden border-t border-white/20 py-3 ${mobileSearchOpen ? "block" : "hidden"}`}
        >
          <SearchBar
            searchTerm={searchTerm}
            location={locationInput}
            onSearchTermChange={setSearchTerm}
            onLocationChange={setLocationInput}
            onSubmit={handleSubmit}
            variant={isHome && !scrolled ? "overlay" : "default"}
            iconSubmit={useIconSearch}
            findPlaceholder={searchFindPh}
            locationPlaceholder={searchLocPh}
          />
        </div>

        {isExplore ? (
          <div className="flex items-center gap-1 sm:gap-2 py-2 border-t border-white/15 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {EXPLORE_CATEGORY_ROW.map((c) => (
              <Link
                key={c.label}
                to={exploreWithQuery(c.q)}
                className="shrink-0 inline-flex items-center gap-0.5 text-xs sm:text-sm font-semibold text-white/95 hover:text-white whitespace-nowrap px-2 sm:px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
              >
                {c.label}
                <span className="text-[10px] text-white/60 select-none" aria-hidden>
                  ▾
                </span>
              </Link>
            ))}
          </div>
        ) : isHome ? (
          <div
            className={`flex md:flex items-center gap-1 lg:gap-2 py-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              scrolled ? "border-t border-white/15" : "border-t border-transparent"
            }`}
          >
            {HOME_TOP_CATEGORIES.map((c) => (
              <Link
                key={c.label}
                to={exploreWithQuery(c.q)}
                className="shrink-0 text-xs sm:text-sm font-semibold text-white/90 hover:text-white whitespace-nowrap px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
              >
                {c.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
