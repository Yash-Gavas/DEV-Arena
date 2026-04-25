import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import DSAProblems from "./pages/DSAProblems";
import AIInterview from "./pages/AIInterview";
import InterviewReport from "./pages/InterviewReport";
import Profile from "./pages/Profile";
import Resources from "./pages/Resources";
import ProblemWorkspace from "./pages/ProblemWorkspace";
import SQLPlayground from "./pages/SQLPlayground";
import DSAVisualizer from "./pages/DSAVisualizer";
import Community from "./pages/Community";
import { Toaster } from "./components/ui/sonner";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/problems" element={<ProtectedRoute><DSAProblems /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><AIInterview /></ProtectedRoute>} />
        <Route path="/interview/:interviewId" element={<ProtectedRoute><AIInterview /></ProtectedRoute>} />
        <Route path="/reports/:reportId" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
        <Route path="/problems/:problemId" element={<ProtectedRoute><ProblemWorkspace /></ProtectedRoute>} />
        <Route path="/sql" element={<ProtectedRoute><SQLPlayground /></ProtectedRoute>} />
        <Route path="/visualizer" element={<ProtectedRoute><DSAVisualizer /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
      </Routes>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
