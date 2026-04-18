# Fusion

A modern performance metrics and benchmarking dashboard built with Next.js, React, and Tailwind CSS. Fusion provides real-time analytics, model consensus tracking, and comprehensive performance insights.

## Features

- **Performance Metrics**: Real-time quality, consensus, and variance analytics
- **Interactive Charts**: Benchmark trends visualization with hover details
- **Model Consensus**: Track agreement levels across multiple AI models
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode Support**: Built-in theme switching with next-themes
- **Component Library**: Pre-built UI components using Radix UI and shadcn

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16.2.0
- **React**: 19.x with React DOM
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4.2.0
- **UI Components**: 
  - [Radix UI](https://www.radix-ui.com/) - Accessible component primitives
  - [shadcn/ui](https://ui.shadcn.com/) - High-quality component library
- **Forms**: [React Hook Form](https://react-hook-form.com/) 7.54.1 + Zod validation
- **Charts**: [Recharts](https://recharts.org/) 2.15.0
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **TypeScript**: 5.7.3

## Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
fusion/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/                # Shadcn UI components
│   ├── stats-panel.tsx    # Performance metrics dashboard
│   ├── header.tsx         # Header component
│   ├── sidebar.tsx        # Sidebar navigation
│   └── theme-provider.tsx # Theme configuration
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── public/                # Static assets
```

## Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Building

```bash
npm run build
npm start
```

## Linting

```bash
npm run lint
```

## License

MIT
