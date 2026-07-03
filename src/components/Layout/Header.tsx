import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Plus, Shield, LogOut, LogIn, ChevronDown, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthModal } from '@/components/Auth/AuthModal';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { Permission } from '@/types/auth';
import { useSearchStore } from '@/stores/searchStore';
import { debounce } from '@/utils/debounce';

interface HeaderProps {
  /** Retained for backwards compatibility with the old stats display; unused
      in the new thin topbar. */
  totalLessons?: number;
  /** Same — kept in the signature so App.tsx prop-passing stays untouched. */
  totalCategories?: number;
}

/**
 * Thin paper+ink topbar (56px) used app-wide. Matches the internal design
 * system: sprout icon + wordmark on the left, an inline search input on
 * the search routes only, Submit/Review nav (permission-gated) + user menu
 * on the right.
 */
export const Header: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission } = useEnhancedAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const onSearchRoute = location.pathname === '/' || location.pathname === '/search';

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <>
      <header className="int-topbar">
        <Link to="/" className="int-brand" aria-label="ESYNYC home">
          <img src="/icons/icon-sprout-green.png" alt="" />
          <div className="int-brand-text">
            ESYNYC
            <small>Lesson Library</small>
          </div>
        </Link>

        {onSearchRoute && <HeaderSearch />}

        <nav className="int-topbar-right">
          <Link to="/submit" className="int-nav-link int-nav-link--cta">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Submit Lesson</span>
          </Link>
          {hasPermission(Permission.REVIEW_LESSONS) && (
            <Link to="/review" className="int-nav-link">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Review</span>
            </Link>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="int-nav-link"
              aria-label="User account"
              aria-expanded={showUserMenu}
            >
              <User className="w-4 h-4" aria-hidden="true" />
              {user && <ChevronDown className="w-3 h-3" aria-hidden="true" />}
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-64 rounded-md border text-sm"
                style={{
                  background: 'var(--color-esy-white)',
                  borderColor: 'var(--color-esy-ink-10)',
                  color: 'var(--color-esy-ink)',
                  boxShadow: '0 6px 18px rgba(26,26,26,0.08)',
                  padding: '6px 0',
                }}
              >
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-[var(--color-esy-ink-10)]">
                      <p className="font-medium">{user.email}</p>
                      <p className="text-xs text-[var(--color-esy-ink-50)] capitalize">
                        {user.role?.replace('_', ' ') || 'Teacher'}
                      </p>
                    </div>
                    <MenuLink to="/profile" onSelect={() => setShowUserMenu(false)}>
                      <User className="w-4 h-4" /> My Profile
                    </MenuLink>
                    {(hasPermission(Permission.VIEW_USERS) ||
                      hasPermission(Permission.VIEW_ANALYTICS) ||
                      hasPermission(Permission.REVIEW_LESSONS)) && (
                      <>
                        <div
                          className="my-1"
                          style={{ borderTop: '1px solid var(--color-esy-ink-10)' }}
                        />
                        <MenuLink to="/admin" onSelect={() => setShowUserMenu(false)}>
                          <Shield className="w-4 h-4" /> Admin Dashboard
                        </MenuLink>
                      </>
                    )}
                    {hasPermission(Permission.VIEW_USERS) && (
                      <MenuLink to="/admin/users" onSelect={() => setShowUserMenu(false)}>
                        <Users className="w-4 h-4" /> Manage Users
                      </MenuLink>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[var(--color-esy-paper-alt)]"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[var(--color-esy-paper-alt)]"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
};

/** Compact search input rendered only on search routes. */
function HeaderSearch() {
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const [localQuery, setLocalQuery] = useState(filters.query);

  useEffect(() => {
    setLocalQuery(filters.query);
  }, [filters.query]);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setFilters({ query });
      }, 300),
    [setFilters]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <div className="int-search">
      <Search width={15} height={15} aria-hidden="true" />
      <input
        type="text"
        value={localQuery}
        onChange={(e) => {
          setLocalQuery(e.target.value);
          debouncedSearch(e.target.value);
        }}
        placeholder="Search title, summary, ingredient, skill…"
        aria-label="Search lessons"
      />
      {localQuery && (
        <button
          type="button"
          className="int-search-clear"
          onClick={() => {
            setLocalQuery('');
            setFilters({ query: '' });
          }}
          aria-label="Clear search"
        >
          <X width={12} height={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface MenuLinkProps {
  to: string;
  onSelect: () => void;
  children: React.ReactNode;
}
function MenuLink({ to, onSelect, children }: MenuLinkProps) {
  return (
    <Link
      to={to}
      onClick={onSelect}
      className="block w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[var(--color-esy-paper-alt)]"
    >
      {children}
    </Link>
  );
}
