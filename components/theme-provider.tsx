'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const originalError = console.error
      console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) {
          return // Suppress harmless next-themes React 19 warning
        }
        originalError(...args)
      }
      return () => {
        console.error = originalError
      }
    }
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
