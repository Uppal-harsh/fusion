'use client'
import { ChevronRight, Search, Bell, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleDarkMode = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  if (!mounted) return null

  return (
    <header className="h-16 border-b border-border/90 bg-card flex items-center justify-between px-6 gap-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" className="text-sidebar-foreground hover:text-foreground font-medium h-auto p-0">
          Responses
        </Button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground h-auto p-0">
          New Fusion Session
        </Button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="relative hidden md:flex">
          <Input
            type="text"
            placeholder="Search models..."
            className="text-xs pl-3 pr-8"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        </div>
        
        <Button variant="ghost" size="icon" className="text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="text-foreground"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  )
}
