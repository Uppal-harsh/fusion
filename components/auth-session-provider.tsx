'use client'

import { SessionProvider } from 'next-auth/react'

export default function AuthSessionProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <SessionProvider>{children}</SessionProvider>
}
