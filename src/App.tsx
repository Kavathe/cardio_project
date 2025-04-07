import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ReportsDashboard from "./pages/ReportsDashboard";
import EcgMonitor from "./pages/EcgMonitor";
import PatientDashboard from "./pages/patientDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component with role-based access
const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: JSX.Element,
  requiredRole?: 'doctor' | 'patient' | undefined
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAuthenticated(true);
        setUserRole(user.type || null);
      } catch (error) {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
  }, []);

  if (isAuthenticated === null) {
    // Still checking auth status
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // If role is required and user's role doesn't match
  if (requiredRole && userRole !== requiredRole) {
    // Redirect doctors to ECG monitor if they try to access patient dashboard
    if (userRole === 'doctor' && requiredRole === 'patient') {
      return <Navigate to="/ecg-monitor" />;
    }
    // Redirect patients to patient dashboard if they try to access doctor pages
    if (userRole === 'patient' && requiredRole === 'doctor') {
      return <Navigate to="/patient-dashboard" />;
    }
  }

  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute requiredRole="doctor">
                <ReportsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ecg-monitor" 
            element={
              <ProtectedRoute requiredRole="doctor">
                <EcgMonitor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient-dashboard" 
            element={
              <ProtectedRoute requiredRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
