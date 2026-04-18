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
} from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'

export default function Sidebar({ onHistoryClick }: { onHistoryClick?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const labelClass = `overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${isExpanded ? 'max-w-[140px] opacity-100 ml-3 visible' : 'max-w-0 opacity-0 ml-0 invisible'
    }`

  const getRowClass = (active = false) => {
    return `flex items-center rounded-xl transition-all duration-200 w-full text-sm h-11 px-3 ${isExpanded ? 'justify-start' : 'justify-center'
      } ${active
        ? 'bg-sidebar-accent text-sidebar-foreground font-medium shadow-sm shadow-black/10'
        : 'text-muted-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      }`
  }

  return (
    <div
      className={`border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'w-64' : 'w-[68px]'
        }`}
    >
      {/* Header — Logo & Toggle */}
      <div className={`flex items-center h-16 transition-all duration-300 ${isExpanded ? 'px-4' : 'justify-center px-0'}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2.5 rounded-xl hover:bg-sidebar-accent transition-colors text-sidebar-foreground flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className={`text-sidebar-foreground flex items-center gap-2.5 text-[22px] font-brand font-[800] tracking-tight ${labelClass}`}>
          <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-primary/20 bg-background flex-shrink-0 shadow-sm shadow-primary/10">
            <Image
              src="/logo.png"
              alt="Logo"
              fill
              className="object-cover scale-110"
            />
          </div>
          <span className="leading-none mt-1">Fusion</span>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-2 pb-3">
        <button className={`flex items-center rounded-xl bg-primary/10 hover:bg-primary/[0.17] border border-primary/20 transition-all text-primary text-sm font-medium w-full h-11 ${isExpanded ? 'px-4 justify-start' : 'justify-center px-0'}`}>
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>New Chat</span>
        </button>
      </div>

      {/* Separator */}
      <div className="mx-4 h-px bg-sidebar-border/60" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {[
            { icon: Home, label: 'Home', active: true },
            { icon: Zap, label: 'Quick Compare', active: false },
            { icon: History, label: 'History', active: false, onClick: onHistoryClick },
          ].map((item) => (
            <button
              key={item.label}
              className={getRowClass(item.active)}
              onClick={item.onClick}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Actions */}
        <div className="space-y-1">
          {[
            { icon: HelpCircle, label: 'Help' },
            { icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.label}
              className={getRowClass(false)}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className={labelClass}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-accent/10">
        <button className={getRowClass(false)}>
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/10 shadow-sm shadow-primary/5">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className={`flex-1 text-left ${labelClass}`}>
            <div>
              <p className="text-[11px] font-bold leading-none tracking-tight">HARSH UPPAL</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest font-bold">Pro Account</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
