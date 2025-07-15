# ESNYC Lesson Search Interface - React Version

A modern, responsive React/TypeScript application for searching and filtering 831 tagged Edible Schoolyard NYC lesson plans. This version features advanced filtering capabilities, hierarchical search, and a Supabase backend.

## 🌟 Features

### Advanced Search & Filtering
- **Full-text Search**: Searches across titles, summaries, ingredients, skills, and metadata
- **Smart Filtering**: 16+ categories including grade levels, themes, seasons, cultural heritage
- **Hierarchical Cultural Search**: Select "Asian" to find all Asian cultures and subcultures
- **Ingredient Grouping**: Search "butternut squash" to find "Winter squash" lessons
- **Activity Type Detection**: Automatically categorizes lessons based on cooking/garden skills
- **Season Logic**: Special "Include year-round lessons" option for seasonal searches

### Modern Architecture
- **React 19** with TypeScript for type safety
- **Supabase** backend with PostgreSQL database
- **Tailwind CSS** with custom design system
- **Zustand** for state management
- **TanStack React Query** for server state and caching
- **Responsive Design** works on desktop, tablet, and mobile

### Enhanced UI/UX
- **2-Column Layout** with full lesson summaries (matches original design)
- **Direct Lesson Links**: Dedicated "View Lesson Plan" buttons on each card
- **Modal Details**: Comprehensive lesson information in overlay
- **Export Functionality**: CSV download of filtered results
- **Real-time Filtering**: Instant results without server round-trips

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- npm or yarn
- Supabase account (for backend)

### Installation

```bash
# Clone the repository
git clone https://github.com/danfeder/esnyc-lesson-search-react.git
cd esnyc-lesson-search-react

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Environment Setup

Create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Development

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🗄️ Database Setup

This version uses Supabase as the backend. The database schema includes:

- `lessons` table with full-text search capabilities
- `user_profiles` for user management
- `saved_searches` for bookmarked searches
- `lesson_collections` for curated lesson lists
- `bookmarks` for individual lesson bookmarks

### Data Import

```bash
# Import lesson data to Supabase
npm run import-data
```

## 🎯 Key Improvements Over Original

### Advanced Filtering Logic
- **Cultural Heritage Hierarchy**: Sophisticated parent-child relationships
- **Ingredient Grouping**: Smart categorization for food-related searches
- **Core Competencies**: Filter by ESNYC's 6 educational priorities
- **Lesson Format**: Filter by lesson structure and timing
- **Enhanced Activity Types**: Accurate classification based on skills data

### Modern Development
- **TypeScript**: Full type safety and better developer experience
- **Component Architecture**: Reusable, maintainable React components
- **State Management**: Predictable state with Zustand
- **Performance**: Optimized with React Query caching
- **Accessibility**: WCAG compliant components

### Better User Experience
- **Responsive Design**: Works seamlessly across all devices
- **Loading States**: Proper loading indicators and error handling
- **Search Suggestions**: Smart suggestions when no results found
- **Filter Counts**: Real-time counts for each filter option

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Filters/        # Filter sidebar and controls
│   ├── Layout/         # App-wide layout components
│   ├── Modal/          # Modal dialogs
│   ├── Results/        # Results display components
│   └── Search/         # Search input and related UI
├── hooks/              # Custom React hooks
├── lib/                # External service configurations
├── pages/              # Page-level components
├── stores/             # Zustand state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and constants
└── index.css           # Global styles and Tailwind config
```

## 🔧 Configuration

### Tailwind CSS
Custom design system with ESNYC brand colors:
- Primary green: `#2c5530`
- Accent orange: `#ff6b35`

### Filtering Constants
All filtering logic is centralized in `src/utils/filterConstants.ts`:
- Cultural heritage hierarchies
- Ingredient groupings
- Core competencies
- Lesson formats

## 🚀 Deployment

### Netlify (Recommended)
```bash
# Build command
npm run build

# Publish directory
dist
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Manual Deployment
```bash
# Build the project
npm run build

# Upload the dist/ folder to your hosting provider
```

## 🔗 Related Projects

- **[Original Vanilla JS Version](https://github.com/danfeder/esnyc-lesson-search)**: Simpler version with static JSON data
- **Supabase Backend**: PostgreSQL database with full-text search

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. The lesson content belongs to Edible Schoolyard NYC.

## 🙏 Acknowledgments

- **Edible Schoolyard NYC** for the lesson content and educational mission
- **Original vanilla JS version** for the foundation and requirements
- **Teachers and educators** who use these resources daily

---

**Built with ❤️ for ESNYC educators**

For questions or support, please open an issue or contact the maintainers.