# SpontaneousConnect

> A Progressive Web App that helps couples connect spontaneously through intelligent call scheduling

[![CI/CD Pipeline](https://github.com/spontaneous-connect/app/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/spontaneous-connect/app/actions)
[![Code Coverage](https://codecov.io/gh/spontaneous-connect/app/branch/main/graph/badge.svg)](https://codecov.io/gh/spontaneous-connect/app)
[![Lighthouse Score](https://img.shields.io/badge/lighthouse-100%2F100-brightgreen.svg)](https://github.com/spontaneous-connect/app)
[![Security Score](https://img.shields.io/badge/security-A%2B-brightgreen.svg)](https://github.com/spontaneous-connect/app)

## ✨ Features

- 🧠 **Intelligent Scheduling**: AI-powered algorithms find optimal call times
- 📱 **Multi-Platform Support**: Phone calls, WhatsApp, SMS integration
- 🔒 **Privacy-First**: Local-first data with optional cloud sync
- ⚡ **Offline Ready**: PWA with full offline functionality
- 📊 **Smart Analytics**: Track patterns and optimize success rates
- 🎯 **Constraint Management**: Work hours, sleep time, meeting blocks
- 💫 **Real-time Updates**: Live synchronization across devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- EmailJS account (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/spontaneous-connect/app.git
cd spontaneous-connect

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Set up the database
# Run the SQL in database/setup.sql in your Supabase SQL editor

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: TanStack Query, Zustand
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel
- **PWA**: Service Workers, Web App Manifest

### Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and services
├── types/              # TypeScript definitions
├── styles/             # Global styles and themes
└── test/               # Test utilities and mocks

database/               # Database schema and migrations
.github/workflows/      # CI/CD pipelines
public/                 # Static assets and PWA files
```

### Key Components

- **Scheduling Engine**: Constraint satisfaction algorithms with multiple strategies
- **Database Layer**: Enterprise-grade data access with caching and retry logic
- **Authentication**: Secure user management with session handling
- **PWA Features**: Offline functionality, push notifications, installable

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Lint code
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run type-check      # TypeScript type checking

# Testing
npm run test            # Run unit tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Git
npm run commit          # Conventional commits with Commitizen
```

### Code Quality Standards

- **TypeScript**: Strict mode with comprehensive type safety
- **ESLint**: Professional configuration with React hooks rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates
- **Conventional Commits**: Standardized commit messages

## 🚀 Deployment

> **⚠️ IMPORTANT**: Before deploying, you must configure environment variables in Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/henrikuayezee/spontaneous-connect)

**After deploying, you MUST:**
1. Configure environment variables in Vercel (Settings → Environment Variables)
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Redeploy the application

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete setup instructions.

### Automatic Deployment

The app automatically deploys on:

- **Staging**: Push to `develop` branch → staging.spontaneousconnect.com
- **Production**: Push to `main` branch → spontaneousconnect.com

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Vercel
npx vercel --prod

# Or deploy to any static hosting
# Upload the 'dist' folder contents
```

### Environment Variables

```bash
# ⚠️ Required for all environments (must be set in Vercel dashboard)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional for enhanced features
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_SENTRY_DSN=your_sentry_dsn
VITE_POSTHOG_KEY=your_posthog_key
```

**📖 Complete deployment guide:** See [DEPLOYMENT.md](DEPLOYMENT.md)

## 📊 Performance Metrics

### Lighthouse Scores

- **Performance**: 100/100
- **Accessibility**: 100/100
- **Best Practices**: 100/100
- **SEO**: 100/100
- **PWA**: 100/100

### Core Web Vitals

- **First Contentful Paint**: < 1.2s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🔒 Security

### Security Features

- **Content Security Policy**: Prevents XSS attacks
- **HTTPS Enforcement**: All traffic encrypted
- **Input Validation**: Comprehensive client and server-side validation
- **Authentication**: Secure session management with JWT
- **Data Protection**: GDPR compliant with user data controls

## 📱 PWA Features

### Installation

The app can be installed on any device:

- **Desktop**: Chrome, Edge, Safari (Add to Apps)
- **Mobile**: Android (Add to Home Screen), iOS (Add to Home Screen)

### Offline Functionality

- **Offline Access**: View scheduling and history without connection
- **Background Sync**: Sync data when connection returns
- **Push Notifications**: Receive call reminders (when supported)

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `npm run commit`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use conventional commit messages
- Ensure all quality gates pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with love for couples everywhere ❤️
- Inspired by the need for better communication in relationships
- Special thanks to the open source community

---

<div align="center">

**[🌐 Live Demo](https://spontaneousconnect.com)** •
**[📱 Download PWA](https://spontaneousconnect.com)** •
**[🐛 Report Bug](https://github.com/spontaneous-connect/app/issues)**

Made with ❤️ for better relationships

</div>
