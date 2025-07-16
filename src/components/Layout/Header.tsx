import React from 'react';
import { Link } from 'react-router-dom';
import { Search, User } from 'lucide-react';

interface HeaderProps {
  totalLessons?: number;
  totalCategories?: number;
}

export const Header: React.FC<HeaderProps> = ({ totalLessons = 831, totalCategories = 16 }) => {
  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
            <div className="text-4xl">🌱</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Edible Schoolyard NYC</h1>
              <p className="text-primary-100 text-sm">Modern Lesson Library</p>
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
            <button 
              className="p-2 hover:bg-primary-500 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="w-6 h-6" />
            </button>
            <button 
              className="p-2 hover:bg-primary-500 rounded-lg transition-colors"
              aria-label="User account"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
