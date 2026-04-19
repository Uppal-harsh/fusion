import type { Metadata } from 'next'
import { Inter, Darker_Grotesque } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import AuthSessionProvider from '@/components/auth-session-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const darkerGrotesque = Darker_Grotesque({
  subsets: ['latin'],
  variable: '--font-darker-grotesque',
})

export const metadata: Metadata = {
  title: 'Fusion',
  description: 'Fusion — Multi-AI Response Comparator',
  generator: 'Fusion',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${darkerGrotesque.variable} font-sans antialiased text-foreground bg-background`}>
        <AuthSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
            enableColorScheme={false}
          >
            <TooltipProvider delayDuration={300}>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </AuthSessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
