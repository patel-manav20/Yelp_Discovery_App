import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import yelpBrandLogo from "../../assets/yelp-logo-brand.png";

const footerLink =
  "text-sm text-gray-600 hover:text-yelp-red hover:underline transition-colors";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-surface-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              About
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className={footerLink}>
                  About this project
                </a>
              </li>
              <li>
                <a href="#" className={footerLink}>
                  Guidelines
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Discover
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to={ROUTES.EXPLORE} className={footerLink}>
                  Browse restaurants
                </Link>
              </li>
              <li>
                <Link to={ROUTES.FAVORITES} className={footerLink}>
                  Collections
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              For businesses
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to={ROUTES.EXPLORE} className={footerLink}>
                  Find your business
                </Link>
              </li>
              <li>
                <Link to={ROUTES.OWNER_SIGNUP} className={footerLink}>
                  Owner sign up
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              Help
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className={footerLink}>
                  Support
                </a>
              </li>
              <li>
                <a href="#" className={footerLink}>
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-200/80 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <img
              src={yelpBrandLogo}
              alt="Yelp"
              className="h-11 w-auto sm:h-12 md:h-14 max-h-14 object-contain shrink-0"
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              © 2026 LAB 1 — Distributed Systems
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
