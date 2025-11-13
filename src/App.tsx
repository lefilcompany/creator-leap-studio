import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Brands from "./pages/Brands";
import Themes from "./pages/Themes";
import Personas from "./pages/Personas";
import History from "./pages/History";
import CreateContent from "./pages/CreateContent";
import ContentResult from "./pages/ContentResult";
import VideoResult from "./pages/VideoResult";
import ReviewContent from "./pages/ReviewContent";
import ReviewResult from "./pages/ReviewResult";
import PlanContent from "./pages/PlanContent";
import PlanResult from "./pages/PlanResult";
import QuickContent from "./pages/QuickContent";
import QuickContentResult from "./pages/QuickContentResult";
import Plans from "./pages/Plans";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            
            {/* Dashboard routes with sidebar layout */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="brands" element={<Brands />} />
              <Route path="themes" element={<Themes />} />
              <Route path="personas" element={<Personas />} />
              <Route path="history" element={<History />} />
              <Route path="create" element={<CreateContent />} />
              <Route path="result" element={<ContentResult />} />
              <Route path="video-result" element={<VideoResult />} />
              <Route path="review" element={<ReviewContent />} />
              <Route path="review-result" element={<ReviewResult />} />
              <Route path="plan" element={<PlanContent />} />
              <Route path="plan-result" element={<PlanResult />} />
              <Route path="quick-content" element={<QuickContent />} />
              <Route path="quick-content-result" element={<QuickContentResult />} />
              <Route path="plans" element={<Plans />} />
              <Route path="team" element={<Team />} />
              <Route path="team-dashboard" element={<TeamDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="credit-history" element={<CreditHistory />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
            </Route>

            {/* Action View - Outside dashboard layout for full screen */}
            <Route path="/action/:actionId" element={<ProtectedRoute><ActionView /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
