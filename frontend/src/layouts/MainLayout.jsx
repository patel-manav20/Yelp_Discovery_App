import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { ChatAssistantProvider } from "../context/ChatAssistantContext";
import { ROUTES } from "../constants/routes";

export default function MainLayout() {
  const location = useLocation();
  const isHome = location.pathname === ROUTES.HOME;
  const isExplore = location.pathname === ROUTES.EXPLORE;
  const isWriteReviewHub = location.pathname === ROUTES.WRITE_REVIEW;
  const fullBleedMain = isHome || isExplore || isWriteReviewHub;

  return (
    <ChatAssistantProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main
          className={
            fullBleedMain
              ? "flex-1 w-full min-h-0 flex flex-col"
              : "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
          }
        >
          <Outlet />
        </main>
        <Footer />
      </div>
    </ChatAssistantProvider>
  );
}
