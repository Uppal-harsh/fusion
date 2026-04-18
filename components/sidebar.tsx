'use client'

import {
  Menu,
  User,
  Home,
  Zap,
  History,
  Settings,
  HelpCircle,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)

  const labelClass = `overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ${
    isExpanded ? 'max-w-[120px] opacity-100 ml-1' : 'max-w-0 opacity-0 ml-0'
  }`

  const rowClass = 'justify-start gap-3 px-3 py-2.5'

  return (
    <div
      className={`border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out flex flex-col ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Header - Logo & Menu */}
      <div className="flex items-center p-3 border-b border-sidebar-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className={`text-sm font-semibold text-sidebar-foreground flex items-center gap-1 ${labelClass}`}>
          <Sparkles className="w-4 h-4" />
          <span>Fusion</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto">
        {/* New Conversation */}
        <button className={`flex rounded-lg border border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors text-sidebar-primary text-sm font-medium w-full ${rowClass}`}>
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>New Fusion</span>
        </button>

        {/* Divider */}
        <div className={`h-px bg-sidebar-border my-2 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`} />

        {/* Navigation Items */}
        <div className="space-y-1">
          {[
            { icon: Home, label: 'Home', active: false },
            { icon: Zap, label: 'Quick Compare', active: false },
            { icon: History, label: 'History', active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex rounded-lg border border-transparent transition-colors w-full text-sm ${rowClass} ${
                item.active
                  ? 'bg-sidebar-accent text-sidebar-primary border-sidebar-border'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-border/70'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className={`h-px bg-sidebar-border my-3 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`} />

        {/* Help & Settings */}
        <div className="space-y-1 mt-auto">
          {[
            { icon: HelpCircle, label: 'Help' },
            { icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex rounded-lg border border-transparent text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-border/70 transition-colors w-full text-sm ${rowClass}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <button className={`w-full flex items-center rounded-lg border border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:border-sidebar-border/70 transition-colors ${rowClass}`}>
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className={`flex-1 text-left ${labelClass}`}>
            <div>
              <p className="text-xs font-semibold">User</p>
              <p className="text-xs text-sidebar-foreground/85">Profile</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
