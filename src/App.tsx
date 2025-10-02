import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Brands from "./pages/Brands";
import Themes from "./pages/Themes";
import Personas from "./pages/Personas";
import History from "./pages/History";
import CreateContent from "./pages/CreateContent";
import ContentResult from "./pages/ContentResult";
import ReviewContent from "./pages/ReviewContent";
import PlanContent from "./pages/PlanContent";
import Plans from "./pages/Plans";
import Team from "./pages/Team";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import ActionView from "./pages/ActionView";
import { DashboardLayout } from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Dashboard routes with sidebar layout */}
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="brands" element={<Brands />} />
              <Route path="themes" element={<Themes />} />
              <Route path="personas" element={<Personas />} />
              <Route path="history" element={<History />} />
              <Route path="create" element={<CreateContent />} />
              <Route path="result" element={<ContentResult />} />
              <Route path="review" element={<ReviewContent />} />
              <Route path="plan" element={<PlanContent />} />
              <Route path="plans" element={<Plans />} />
              <Route path="team" element={<Team />} />
              <Route path="profile" element={<Profile />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
            </Route>

            {/* Action View - Outside dashboard layout for full screen */}
            <Route path="/historico/:actionId" element={<ProtectedRoute><ActionView /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
