import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from './components/ProtectedRoute';

/* ── Layouts ── */
import CreatorLayout from './components/CreatorLayout';
import LearnerLayout from './components/LearnerLayout';

/* ── Public Pages ── */
import LandingPage from './pages/LandingPage';
import RoleSelection from './pages/RoleSelection';
import CreatorSignup from './pages/CreatorSignup';
import LearnerSignup from './pages/LearnerSignup';
import Login from './pages/Login';
import PackDetail from './pages/PackDetail';
import CreatorPublicProfile from './pages/CreatorPublicProfile';

/* ── Creator Pages ── */
import CreatorDashboard from './pages/CreatorDashboard';
import MyPacks from './pages/MyPacks';
import CreatePack from './pages/CreatePack';
import EditPack from './pages/EditPack';
import Enrollments from './pages/Enrollments';
import CreatorSettings from './pages/CreatorSettings';
import CreatorSubscription from './pages/CreatorSubscription';
/* ── Learner Pages ── */
import LearnerDashboard from './pages/LearnerDashboard';
import Discover from './pages/Discover';
import MySessions from './pages/MySessions';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<RoleSelection />} />
        <Route path="/signup/creator" element={<CreatorSignup />} />
        <Route path="/signup/learner" element={<LearnerSignup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/learner/pack/:id" element={<PackDetail />} />
        <Route path="/creator/:id" element={<CreatorPublicProfile />} />

        {/* Creator routes (protected, with sidebar layout) */}
        <Route path="/creator/dashboard" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorLayout><CreatorDashboard /></CreatorLayout>
          </ProtectedRoute>
        } />
        <Route path="/creator/packs" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorLayout><MyPacks /></CreatorLayout>
          </ProtectedRoute>
        } />
        <Route path="/creator/packs/new" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorLayout><CreatePack /></CreatorLayout>
          </ProtectedRoute>
        } />
        <Route path="/creator/packs/:id/edit" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorLayout><EditPack /></CreatorLayout>
          </ProtectedRoute>
        } />
        <Route path="/creator/enrollments" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorLayout><Enrollments /></CreatorLayout>
          </ProtectedRoute>
        } />
        <Route path="/creator/settings" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorLayout><CreatorSettings /></CreatorLayout>
          </ProtectedRoute>
        } />
        <Route path="/creator/subscription" element={
          <ProtectedRoute allowedRole="creator">
            <CreatorSubscription />
          </ProtectedRoute>
        } />

        {/* Learner routes (protected, with navbar layout) */}
        <Route path="/learner/dashboard" element={
          <ProtectedRoute allowedRole="learner">
            <LearnerLayout><LearnerDashboard /></LearnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/learner/discover" element={
          <ProtectedRoute allowedRole="learner">
            <LearnerLayout><Discover /></LearnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/learner/pack/:id/sessions" element={
          <ProtectedRoute allowedRole="learner">
            <LearnerLayout><MySessions /></LearnerLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}
