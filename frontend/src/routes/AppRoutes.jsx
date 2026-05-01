import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import OwnerRoute from "../components/common/OwnerRoute";
import { ROUTES } from "../constants/routes";

import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import OwnerLoginPage from "../pages/OwnerLoginPage";
import OwnerSignupPage from "../pages/OwnerSignupPage";
import HomePage from "../pages/HomePage";
import ExplorePage from "../pages/ExplorePage";
import RestaurantDetailsPage from "../pages/RestaurantDetailsPage";
import AddRestaurantPage from "../pages/AddRestaurantPage";
import EditRestaurantPage from "../pages/EditRestaurantPage";
import WriteReviewPage from "../pages/WriteReviewPage";
import WriteReviewHubPage from "../pages/WriteReviewHubPage";
import ClaimRestaurantPage from "../pages/ClaimRestaurantPage";
import ProfilePage from "../pages/ProfilePage";
import PreferencesPage from "../pages/PreferencesPage";
import FavoritesPage from "../pages/FavoritesPage";
import HistoryPage from "../pages/HistoryPage";
import OwnerDashboardPage from "../pages/OwnerDashboardPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.EXPLORE} element={<ExplorePage />} />
          <Route path={ROUTES.WRITE_REVIEW} element={<WriteReviewHubPage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
          <Route path={ROUTES.OWNER_LOGIN} element={<OwnerLoginPage />} />
          <Route path={ROUTES.OWNER_SIGNUP} element={<OwnerSignupPage />} />

          <Route
            path={ROUTES.RESTAURANTS_NEW}
            element={
              <ProtectedRoute>
                <AddRestaurantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id/edit"
            element={
              <ProtectedRoute>
                <EditRestaurantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/yelp/:yelpId/review"
            element={
              <ProtectedRoute>
                <WriteReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id/review"
            element={
              <ProtectedRoute>
                <WriteReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id/claim"
            element={
              <ProtectedRoute>
                <ClaimRestaurantPage />
              </ProtectedRoute>
            }
          />
          <Route path="/restaurants/yelp/:yelpId" element={<RestaurantDetailsPage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailsPage />} />

          <Route
            path={ROUTES.PROFILE}
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PREFERENCES}
            element={
              <ProtectedRoute>
                <PreferencesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.FAVORITES}
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.HISTORY}
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.OWNER_DASHBOARD}
            element={
              <OwnerRoute>
                <OwnerDashboardPage />
              </OwnerRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
