# Deployment Guide

This guide covers setting up CI/CD and deploying the ESNYC Lesson Search React application.

## 🚀 Automated CI/CD Pipeline

The project includes comprehensive GitHub Actions workflows for:

### 1. **Main CI/CD Pipeline** (`.github/workflows/ci.yml`)
- **Testing**: Runs on Node.js 18.x and 20.x
- **Type Checking**: TypeScript validation
- **Linting**: Code quality checks
- **Building**: Production builds
- **Preview Deployments**: Automatic PR previews
- **Production Deployment**: Auto-deploy on main branch

### 2. **Security & Dependencies** (`.github/workflows/security.yml`)
- **Security Audits**: Weekly vulnerability scans
- **Dependency Review**: PR dependency analysis
- **CodeQL Analysis**: Static code analysis

### 3. **Performance Monitoring** (`.github/workflows/performance.yml`)
- **Lighthouse CI**: Performance, accessibility, SEO checks
- **Bundle Analysis**: Bundle size monitoring

### 4. **Automated Updates**
- **Dependabot**: Weekly dependency updates
- **Security Patches**: Automatic security updates

## 🔧 Setup Instructions

### Required GitHub Secrets

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

#### Supabase Configuration
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Netlify Deployment (Optional)
```
NETLIFY_AUTH_TOKEN=your-netlify-auth-token
NETLIFY_SITE_ID=your-netlify-site-id
```

#### Vercel Deployment (Optional)
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

### Getting Netlify Tokens

1. **Auth Token**:
   - Go to [Netlify User Settings](https://app.netlify.com/user/applications)
   - Generate a new personal access token
   - Copy the token

2. **Site ID**:
   - Create a new site on Netlify (or use existing)
   - Go to Site Settings > General
   - Copy the Site ID

### Getting Vercel Tokens

1. **Token**:
   - Go to [Vercel Account Settings](https://vercel.com/account/tokens)
   - Create a new token
   - Copy the token

2. **Project & Org IDs**:
   - Install Vercel CLI: `npm i -g vercel`
   - Run `vercel link` in your project
   - IDs will be saved in `.vercel/project.json`

## 📦 Manual Deployment Options

### Netlify

#### Option 1: Drag & Drop
```bash
npm run build
# Upload the dist/ folder to Netlify
```

#### Option 2: CLI
```bash
npm install -g netlify-cli
netlify login
npm run deploy:netlify
```

#### Option 3: Git Integration
1. Connect your GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Vercel

#### Option 1: CLI
```bash
npm install -g vercel
vercel login
npm run deploy:vercel
```

#### Option 2: Git Integration
1. Connect your GitHub repo to Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables in Vercel dashboard

### Other Platforms

#### GitHub Pages
```bash
npm run build
# Use GitHub Pages action or upload dist/ manually
```

#### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

#### AWS S3 + CloudFront
```bash
npm run build
# Upload dist/ to S3 bucket
# Configure CloudFront distribution
```

## 🔍 Performance Monitoring

### Lighthouse CI
The project includes automated Lighthouse testing:

```bash
npm run test:lighthouse
```

**Thresholds**:
- Performance: ≥80%
- Accessibility: ≥90%
- Best Practices: ≥80%
- SEO: ≥80%

### Bundle Analysis
Monitor bundle size and dependencies:

```bash
npm run analyze
```

## 🛡️ Security

### Automated Security Checks
- **npm audit**: Weekly vulnerability scans
- **Dependabot**: Automatic dependency updates
- **CodeQL**: Static code analysis
- **Dependency Review**: PR security analysis

### Manual Security Audit
```bash
npm audit
npm audit fix
```

## 🔄 Workflow Triggers

### CI/CD Pipeline Runs On:
- **Push to main**: Full CI + Production deployment
- **Pull Requests**: Full CI + Preview deployment
- **Push to develop**: Full CI only

### Security Scans Run On:
- **Weekly schedule**: Monday 9 AM UTC
- **Push to main**: CodeQL analysis
- **Pull Requests**: Dependency review

### Performance Tests Run On:
- **Push to main**: Full Lighthouse audit
- **Pull Requests**: Performance regression checks

## 📊 Monitoring & Alerts

### GitHub Actions
- Build status badges
- PR deployment previews
- Performance regression alerts
- Security vulnerability notifications

### Deployment Status
- Netlify: Build logs and deploy previews
- Vercel: Deployment dashboard and analytics
- Custom: Health checks and uptime monitoring

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check TypeScript errors
npm run type-check

# Check for dependency issues
npm ci
npm audit fix
```

#### Environment Variables
- Ensure all required secrets are set in GitHub
- Check variable names match exactly
- Verify Supabase credentials are correct

#### Deployment Failures
- Check build logs in GitHub Actions
- Verify deployment platform credentials
- Ensure build output directory is correct (`dist/`)

### Debug Commands
```bash
# Local build test
npm run build
npm run preview

# Check bundle size
npm run analyze

# Test Lighthouse locally
npm run test:lighthouse
```

## 📈 Optimization Tips

### Performance
- Enable gzip compression
- Use CDN for static assets
- Implement service worker for caching
- Optimize images and fonts

### SEO
- Add meta tags and Open Graph data
- Implement structured data
- Create sitemap.xml
- Add robots.txt

### Accessibility
- Test with screen readers
- Ensure keyboard navigation
- Maintain color contrast ratios
- Add proper ARIA labels

---

For questions or issues with deployment, please check the GitHub Actions logs or open an issue in the repository.