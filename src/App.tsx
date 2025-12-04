import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';
import { AppErrorFallback } from '@/components/Common/AppErrorFallback';
import { RouteErrorFallback } from '@/components/Common/RouteErrorFallback';
import { ReviewErrorBoundary } from '@/components/Common/ReviewErrorBoundary';
import { PageLoader } from '@/components/Common/PageLoader';
import { Header } from '@/components/Layout/Header';
import { SearchPage } from '@/pages/SearchPage';
import { useLessonStats } from '@/hooks/useLessonStats';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { Permission } from '@/types/auth';
import { logger } from '@/utils/logger';

// Lazy load all pages except SearchPage (landing page)
// Note: We use .then((m) => ({ default: m.ComponentName })) because our pages
// use named exports. React.lazy() requires a default export, so we remap it.
const SubmissionPage = lazy(() =>
  import('@/pages/SubmissionPage').then((m) => ({ default: m.SubmissionPage }))
);
const ReviewDashboard = lazy(() =>
  import('@/pages/ReviewDashboard').then((m) => ({ default: m.ReviewDashboard }))
);
const ReviewDetail = lazy(() =>
  import('@/pages/ReviewDetail').then((m) => ({ default: m.ReviewDetail }))
);
const AdminDuplicates = lazy(() =>
  import('@/pages/AdminDuplicates').then((m) => ({ default: m.AdminDuplicates }))
);
const AdminDuplicateReview = lazy(() =>
  import('@/pages/AdminDuplicateReview').then((m) => ({ default: m.AdminDuplicateReview }))
);
const AdminUsers = lazy(() =>
  import('@/pages/AdminUsers').then((m) => ({ default: m.AdminUsers }))
);
const AdminUserDetail = lazy(() =>
  import('@/pages/AdminUserDetail').then((m) => ({ default: m.AdminUserDetail }))
);
const AdminInviteUser = lazy(() =>
  import('@/pages/AdminInviteUser').then((m) => ({ default: m.AdminInviteUser }))
);
const AdminInvitations = lazy(() =>
  import('@/pages/AdminInvitations').then((m) => ({ default: m.AdminInvitations }))
);
const AdminAnalytics = lazy(() =>
  import('@/pages/AdminAnalytics').then((m) => ({ default: m.AdminAnalytics }))
);
const AdminDashboard = lazy(() =>
  import('@/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const UserProfile = lazy(() =>
  import('@/pages/UserProfile').then((m) => ({ default: m.UserProfile }))
);
const AcceptInvitation = lazy(() =>
  import('@/pages/AcceptInvitation').then((m) => ({ default: m.AcceptInvitation }))
);
const ResetPassword = lazy(() =>
  import('@/pages/ResetPassword').then((m) => ({ default: m.ResetPassword }))
);
const VerifySetup = lazy(() =>
  import('@/pages/VerifySetup').then((m) => ({ default: m.VerifySetup }))
);

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
      <ErrorBoundary fallback={RouteErrorFallback}>
        <div className="min-h-screen bg-gray-50">
          <Header totalLessons={totalLessons} totalCategories={totalCategories} />

          <main>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/submit" element={<SubmissionPage />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
                      <ReviewErrorBoundary>
                        <ReviewDetail />
                      </ReviewErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute
                      permissions={[
                        Permission.VIEW_USERS,
                        Permission.VIEW_ANALYTICS,
                        Permission.MANAGE_DUPLICATES,
                        Permission.REVIEW_LESSONS,
                      ]}
                    >
                      <AdminDashboard />
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
                      <AdminDuplicateReview />
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
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute permissions={[Permission.VIEW_ANALYTICS]}>
                      <AdminAnalytics />
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
            </Suspense>
          </main>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary
      fallback={AppErrorFallback}
      onError={(error, errorInfo) => {
        logger.error('App Error:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppContent />
        {/* React Query DevTools - only in development */}
        {import.meta.env.MODE === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
