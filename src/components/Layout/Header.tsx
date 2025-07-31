import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Plus, Shield, LogOut, LogIn, ChevronDown, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthModal } from '../Auth/AuthModal';
import { APP_VERSION } from '../../config/version';
import { useEnhancedAuth } from '../../hooks/useEnhancedAuth';
import { Permission } from '../../types/auth';

interface HeaderProps {
  totalLessons?: number;
  totalCategories?: number;
}

export const Header: React.FC<HeaderProps> = ({ totalLessons = 831, totalCategories = 11 }) => {
  const navigate = useNavigate();
  const { user, hasPermission } = useEnhancedAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Close dropdown when clicking outside
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
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
              <div className="text-4xl">🌱</div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Edible Schoolyard NYC Lesson Library
                </h1>
                <p className="text-primary-100 text-sm">Version {APP_VERSION}</p>
              </div>
            </Link>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400">
                  {totalLessons.toLocaleString()}
                </div>
                <div className="text-sm text-primary-200">Total Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400">{totalCategories}</div>
                <div className="text-sm text-primary-200">Categories</div>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <Link
                to="/submit"
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Submit Lesson</span>
              </Link>
              {hasPermission(Permission.REVIEW_LESSONS) && (
                <Link
                  to="/review"
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-lg transition-colors font-medium"
                >
                  <Shield className="w-5 h-5" />
                  <span className="hidden sm:inline">Review</span>
                </Link>
              )}
              <button
                className="p-2 hover:bg-primary-500 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="w-6 h-6" />
              </button>

              {/* User Menu Dropdown */}
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="inline-flex items-center gap-2 p-2 hover:bg-primary-500 rounded-lg transition-colors"
                  style={{ cursor: 'pointer' }}
                  aria-label="User account"
                  type="button"
                >
                  <User className="w-6 h-6" />
                  {user && <ChevronDown className="w-4 h-4" />}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-2 text-gray-700 z-50">
                    {user ? (
                      <>
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {user.role?.replace('_', ' ') || 'Teacher'}
                          </p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        {hasPermission(Permission.VIEW_USERS) && (
                          <Link
                            to="/admin/users"
                            onClick={() => setShowUserMenu(false)}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Manage Users
                          </Link>
                        )}
                        {hasPermission(Permission.MANAGE_DUPLICATES) && (
                          <Link
                            to="/admin/duplicates"
                            onClick={() => setShowUserMenu(false)}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Manage Duplicates
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowAuthModal(true);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
        }}
      />
    </>
  );
};
