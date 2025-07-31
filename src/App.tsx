import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Header } from './components/Layout/Header';
import { SearchPage } from './pages/SearchPage';
import { SubmissionPage } from './pages/SubmissionPage';
import { ReviewDashboard } from './pages/ReviewDashboard';
import { ReviewDetail } from './pages/ReviewDetail';
import { AdminDuplicates } from './pages/AdminDuplicates';
import { AdminDuplicateDetail } from './pages/AdminDuplicateDetail';
import { AdminUsers } from './pages/AdminUsers';
import { AdminUserDetail } from './pages/AdminUserDetail';
import { AdminInviteUser } from './pages/AdminInviteUser';
import { AdminInvitations } from './pages/AdminInvitations';
import { UserProfile } from './pages/UserProfile';
import { AcceptInvitation } from './pages/AcceptInvitation';
import { VerifySetup } from './pages/VerifySetup';
import { useLessonStats } from './hooks/useLessonStats';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Permission } from './types/auth';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { totalLessons, totalCategories } = useLessonStats();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header totalLessons={totalLessons} totalCategories={totalCategories} />

        <main>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/submit" element={<SubmissionPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route
              path="/review"
              element={
                <ProtectedRoute permissions={[Permission.REVIEW_LESSONS]}>
                  <ReviewDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/:id"
              element={
                <ProtectedRoute permissions={[Permission.REVIEW_LESSONS]}>
                  <ReviewDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/duplicates"
              element={
                <ProtectedRoute permissions={[Permission.MANAGE_DUPLICATES]}>
                  <AdminDuplicates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/duplicates/:groupId"
              element={
                <ProtectedRoute permissions={[Permission.MANAGE_DUPLICATES]}>
                  <AdminDuplicateDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute permissions={[Permission.VIEW_USERS]}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/invite"
              element={
                <ProtectedRoute permissions={[Permission.INVITE_USERS]}>
                  <AdminInviteUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invitations"
              element={
                <ProtectedRoute permissions={[Permission.VIEW_USERS]}>
                  <AdminInvitations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:userId"
              element={
                <ProtectedRoute permissions={[Permission.VIEW_USERS]}>
                  <AdminUserDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            {/* Temporary route for testing - remove in production */}
            <Route path="/verify-setup" element={<VerifySetup />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {/* React Query DevTools - only in development */}
      {import.meta.env.MODE === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
