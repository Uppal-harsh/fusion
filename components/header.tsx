'use client'
import { ChevronRight, Search, Bell, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  return (
    <header className="h-14 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 gap-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" className="text-foreground hover:text-foreground font-medium h-auto p-0 text-[13px]">
          Responses
        </Button>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground h-auto p-0 text-[13px]">
          New Fusion Session
        </Button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 ml-auto">
        <div className="relative hidden md:flex">
          <Input
            type="text"
            placeholder="Search models..."
            className="text-xs pl-3 pr-8 rounded-xl h-8 bg-muted/40 border-border/50 focus:border-primary/30"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
        </div>
        
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative w-8 h-8 rounded-xl">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>

        <div className="h-5 w-px bg-border/50" />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="text-muted-foreground hover:text-foreground w-8 h-8 rounded-xl"
        >
          {mounted ? (resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  )
}
