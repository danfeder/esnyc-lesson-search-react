import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { cleanup } from '@testing-library/react';
// Import store for global cleanup
import { useSearchStore } from '@/stores/searchStore';

// Mock environment variables if not set
if (!process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
}

// Mock Supabase client globally
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn((callback) => Promise.resolve({ data: [], error: null }).then(callback)),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      refreshSession: vi.fn(() => Promise.resolve({ data: null, error: null })),
      setSession: vi.fn(() => Promise.resolve({ data: null, error: null })),
      updateUser: vi.fn(() => Promise.resolve({ data: null, error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
        download: vi.fn(() => Promise.resolve({ data: null, error: null })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
    realtime: {
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })),
    },
  },
}));

// Mock IntersectionObserver
class MockIntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
// eslint-disable-next-line no-undef
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
// eslint-disable-next-line no-undef
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock LazyTabPanel to render content immediately in tests
vi.mock('@/components/Filters/LazyTabPanel', () => ({
  LazyTabPanel: ({ children, className }: any) =>
    React.createElement('div', { className, role: 'tabpanel' }, children),
}));

// Mock Headless UI components for testing
// This fixes tests that fail because of CSS transitions and collapsed disclosure panels
vi.mock('@headlessui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@headlessui/react')>();

  // Create a simple Transition that renders children immediately
  const MockTransition = ({ show, children }: any) => {
    if (show === false) return null;
    return React.createElement(React.Fragment, null, children);
  };

  MockTransition.Child = ({ children }: any) => {
    return React.createElement(React.Fragment, null, children);
  };

  // Create a mock Disclosure that always renders its panel content
  const MockDisclosure = ({ children, defaultOpen: _defaultOpen }: any) => {
    // Pass open=true to children so panel is always visible in tests
    const childContent = typeof children === 'function' ? children({ open: true }) : children;
    return React.createElement(React.Fragment, null, childContent);
  };

  MockDisclosure.Button = ({ children, className, ...props }: any) => {
    return React.createElement('button', { className, ...props }, children);
  };

  MockDisclosure.Panel = ({ children, className }: any) => {
    // Always render panel content in tests
    return React.createElement('div', { className }, children);
  };

  return {
    ...actual,
    Transition: MockTransition,
    Disclosure: MockDisclosure,
  };
});

// Global test cleanup
afterEach(() => {
  // Clean up DOM after each test
  cleanup();

  // Clear all mocks
  vi.clearAllMocks();

  // Reset store state to ensure clean slate
  const store = useSearchStore.getState();
  store.clearFilters();

  // Clear localStorage
  window.localStorage.clear();
});
// Polyfill animations API early to avoid Headless UI warnings
const Elem: any = typeof globalThis !== 'undefined' ? (globalThis as any).Element : undefined;
if (Elem && !('getAnimations' in Elem.prototype)) {
  Object.defineProperty(Elem.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
}
