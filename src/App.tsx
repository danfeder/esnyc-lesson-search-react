import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Header } from './components/Layout/Header';
import { SearchPage } from './pages/SearchPage';
import { SubmissionPage } from './pages/SubmissionPage';
import { ReviewDashboard } from './pages/ReviewDashboard';
import { ReviewDetail } from './pages/ReviewDetail';

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />

          <main>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/submit" element={<SubmissionPage />} />
              <Route path="/review" element={<ReviewDashboard />} />
              <Route path="/review/:id" element={<ReviewDetail />} />
            </Routes>
          </main>
        </div>
      </Router>

      {/* React Query DevTools - only in development */}
      {import.meta.env.MODE === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
