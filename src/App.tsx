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
import { useLessonStats } from './hooks/useLessonStats';

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
            <Route path="/review" element={<ReviewDashboard />} />
            <Route path="/review/:id" element={<ReviewDetail />} />
            <Route path="/admin/duplicates" element={<AdminDuplicates />} />
            <Route path="/admin/duplicates/:groupId" element={<AdminDuplicateDetail />} />
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
