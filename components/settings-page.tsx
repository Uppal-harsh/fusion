'use client'

import { useState } from 'react'
import { User, Bell, Shield, Palette, Key, Trash2, ChevronRight, Check } from 'lucide-react'

const SECTIONS = ['Account', 'Notifications', 'Appearance', 'API Keys', 'Privacy & Security'] as const
type Section = typeof SECTIONS[number]

export default function SettingsPage({ onProfileClick }: { onProfileClick?: () => void }) {
  const [activeSection, setActiveSection] = useState<Section>('Account')
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({
    researchComplete: true,
    weeklyDigest: false,
    productUpdates: true,
    systemAlerts: true,
  })
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>('system')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const SECTION_ICONS: Record<Section, React.ElementType> = {
    'Account': User,
    'Notifications': Bell,
    'Appearance': Palette,
    'API Keys': Key,
    'Privacy & Security': Shield,
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left sidebar nav */}
      <div className="w-64 flex-shrink-0 border-r border-border/60 bg-muted/10 p-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-3">Settings</p>
        {SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section]
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
                activeSection === section
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {section}
              {activeSection === section && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          )
        })}
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto p-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-2xl space-y-10">

          {/* Account */}
          {activeSection === 'Account' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
                <p className="text-muted-foreground text-sm mt-1">Manage your personal account information.</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-6 p-6 rounded-2xl border border-border bg-card">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-3xl font-black text-primary">
                  H
                </div>
                <div>
                  <p className="font-bold text-lg">Harsh Uppal</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Pro Account</p>
                  <button
                    onClick={onProfileClick}
                    className="text-xs text-primary underline mt-2 hover:opacity-70 transition-opacity"
                  >
                    View full profile →
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {[
                  { label: 'Full Name', value: 'Harsh Uppal', type: 'text' },
                  { label: 'Email Address', value: 'harsh@example.com', type: 'email' },
                  { label: 'Username', value: 'harshuppal', type: 'text' },
                ].map(field => (
                  <div key={field.label} className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{field.label}</label>
                    <input
                      type={field.type}
                      defaultValue={field.value}
                      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                ))}
              </div>

              <button onClick={handleSave} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${saved ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90'}`}>
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'Notifications' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
                <p className="text-muted-foreground text-sm mt-1">Control which notifications you receive.</p>
              </div>
              <div className="space-y-3">
                {(Object.entries(notifications) as [keyof typeof notifications, boolean][]).map(([key, val]) => {
                  const labels: Record<keyof typeof notifications, { title: string; desc: string }> = {
                    researchComplete: { title: 'Research Complete', desc: 'Get notified when a long-running comparison finishes.' },
                    weeklyDigest: { title: 'Weekly Digest', desc: 'Receive a weekly summary of your AI Lab activity.' },
                    productUpdates: { title: 'Product Updates', desc: 'News about new Fusion features and improvements.' },
                    systemAlerts: { title: 'System Alerts', desc: 'Critical alerts about your account and service status.' },
                  }
                  return (
                    <div key={key} className="flex items-center justify-between p-5 rounded-2xl border border-border bg-card">
                      <div>
                        <p className="font-semibold text-sm">{labels[key].title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{labels[key].desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${val ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${val ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === 'Appearance' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
                <p className="text-muted-foreground text-sm mt-1">Customize how Fusion looks for you.</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['system', 'dark', 'light'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`p-4 rounded-2xl border-2 text-sm font-bold capitalize transition-all ${theme === t ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-border/80'}`}
                    >
                      <div className={`w-full h-10 rounded-lg mb-3 ${t === 'dark' ? 'bg-zinc-900' : t === 'light' ? 'bg-zinc-100' : 'bg-gradient-to-r from-zinc-900 to-zinc-100'}`} />
                      {t === 'system' ? 'System' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeSection === 'API Keys' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
                <p className="text-muted-foreground text-sm mt-1">Manage your integration keys securely.</p>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'OpenRouter API Key', key: 'sk-or-v1-••••••••••••c07b4', status: 'Active' },
                  { name: 'Gemini API Key', key: 'AIza••••••••••••••••••••X', status: 'Active' },
                  { name: 'Supabase Anon Key', key: 'eyJhbGci••••••••••••••••', status: 'Inactive' },
                ].map(item => (
                  <div key={item.name} className="p-5 rounded-2xl border border-border bg-card flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{item.name}</p>
                      <code className="text-xs text-muted-foreground font-mono mt-0.5 block truncate">{item.key}</code>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>{item.status}</span>
                      <button className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy & Security */}
          {activeSection === 'Privacy & Security' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Privacy & Security</h2>
                <p className="text-muted-foreground text-sm mt-1">Manage your data and security settings.</p>
              </div>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                  <p className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Password</p>
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div key={label} className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">{label}</label>
                      <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                    </div>
                  ))}
                  <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                    Update Password
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3">
                  <p className="font-bold text-sm text-destructive">Danger Zone</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all research history. This action cannot be undone.</p>
                  <button className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20 hover:bg-destructive/20 transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
