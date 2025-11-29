import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingProvider } from "./components/onboarding/OnboardingProvider";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Brands from "./pages/Brands";
import Themes from "./pages/Themes";
import Personas from "./pages/Personas";
import History from "./pages/History";
import CreateImage from "./pages/CreateImage";
import CreateVideo from "./pages/CreateVideo";
import AnimateImage from "./pages/AnimateImage";
import ContentCreationSelector from "./pages/ContentCreationSelector";
import ContentResult from "./pages/ContentResult";
import VideoResult from "./pages/VideoResult";
import ReviewContent from "./pages/ReviewContent";
import ReviewResult from "./pages/ReviewResult";
import PlanContent from "./pages/PlanContent";
import PlanResult from "./pages/PlanResult";
import QuickContent from "./pages/QuickContent";
import QuickContentResult from "./pages/QuickContentResult";
import Plans from "./pages/Plans";
import Credits from "./pages/Credits";
import Team from "./pages/Team";
import TeamDashboard from "./pages/TeamDashboard";
import Profile from "./pages/Profile";
import CreditHistory from "./pages/CreditHistory";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import ActionView from "./pages/ActionView";
import { DashboardLayout } from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import { AdminRoute } from "./components/admin/AdminRoute";

const queryClient = new QueryClient();

import Subscribe from "./pages/Subscribe";
import Onboarding from "./pages/Onboarding";
import OnboardingSuccess from "./pages/OnboardingSuccess";
import OnboardingCanceled from "./pages/OnboardingCanceled";
import PaymentSuccess from "./pages/PaymentSuccess";

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <OnboardingProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/success" element={<OnboardingSuccess />} />
            <Route path="/onboarding/canceled" element={<OnboardingCanceled />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            
            {/* Dashboard routes with sidebar layout */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="brands" element={<Brands />} />
              <Route path="themes" element={<Themes />} />
              <Route path="personas" element={<Personas />} />
              <Route path="history" element={<History />} />
              <Route path="create" element={<ContentCreationSelector />} />
              <Route path="create/quick" element={<QuickContent />} />
              <Route path="create/image" element={<CreateImage />} />
              <Route path="create/video" element={<CreateVideo />} />
              <Route path="create/animate" element={<AnimateImage />} />
              <Route path="result" element={<ContentResult />} />
              <Route path="video-result" element={<VideoResult />} />
              <Route path="review" element={<ReviewContent />} />
              <Route path="review-result" element={<ReviewResult />} />
              <Route path="plan" element={<PlanContent />} />
              <Route path="plan-result" element={<PlanResult />} />
              <Route path="quick-content" element={<QuickContent />} />
              <Route path="quick-content-result" element={<QuickContentResult />} />
              <Route path="plans" element={<Plans />} />
              <Route path="credits" element={<Credits />} />
              <Route path="team" element={<Team />} />
              <Route path="team-dashboard" element={<TeamDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="credit-history" element={<CreditHistory />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="action/:actionId" element={<ActionView />} />
              <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
              </BrowserRouter>
              </TooltipProvider>
            </OnboardingProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
