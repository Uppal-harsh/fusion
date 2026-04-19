'use client'

import { Loader2, Mail, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { TaskType } from '@/lib/engine'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type UserSettings = {
  theme: 'system' | 'light' | 'dark'
  defaultTaskType: TaskType
  autoRun: boolean
  compactView: boolean
}

type UserProfile = {
  email: string
  name: string | null
  image: string | null
  totalRuns: number
  averageConfidence: number
  lastRunAt: string | null
}

type ActivityItem = {
  id: string
  createdAt: string
  eventType: string
  route: string
  statusCode: number | null
  metadata: Record<string, unknown>
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  defaultTaskType: 'general',
  autoRun: false,
  compactView: false,
}

const TASK_OPTIONS: TaskType[] = ['general', 'coding', 'research', 'reasoning', 'creative']

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session, status } = useSession()
  const { setTheme } = useTheme()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    if (!open || status !== 'authenticated') return

    const load = async () => {
      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const [profileRes, settingsRes, activityRes] = await Promise.all([
          fetch('/api/user/profile', { cache: 'no-store' }),
          fetch('/api/user/settings', { cache: 'no-store' }),
          fetch('/api/user/activity?limit=20', { cache: 'no-store' }),
        ])

        if (profileRes.ok) {
          const data = (await profileRes.json()) as { profile: UserProfile }
          setProfile(data.profile)
        }

        if (settingsRes.ok) {
          const data = (await settingsRes.json()) as { settings: UserSettings }
          setSettings(data.settings)
          setTheme(data.settings.theme)
        }

        if (activityRes.ok) {
          const data = (await activityRes.json()) as { items: ActivityItem[] }
          setActivity(data.items || [])
        }
      } catch {
        setError('Failed to load settings data.')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open, setTheme, status])

  const patchSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))

    if (key === 'theme') {
      setTheme(value as UserSettings['theme'])
    }
  }

  const handleSave = async () => {
    if (status !== 'authenticated') return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        throw new Error('Save failed')
      }

      const data = (await response.json()) as { settings: UserSettings }
      setSettings(data.settings)
      setTheme(data.settings.theme)
      setSuccess('Settings saved successfully.')
    } catch {
      setError('Could not save settings right now. Please retry.')
    } finally {
      setSaving(false)
    }
  }

  const isAuthenticated = status === 'authenticated'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4 text-primary" />
              Account & Settings
            </DialogTitle>
            <DialogDescription>
              Manage your logged-in account details and backend preferences.
            </DialogDescription>
          </DialogHeader>
        </div>

        {!isAuthenticated ? (
          <div className="px-5 pb-5 text-sm text-muted-foreground">
            Sign in with Google to view account settings.
          </div>
        ) : (
          <div className="grid gap-4 px-5 pb-5 md:grid-cols-[1.1fr_0.9fr] max-h-[76vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  {profile?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.image} alt="User avatar" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full border border-border bg-background" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{profile?.name || session?.user?.name || 'Signed in user'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {profile?.email || session?.user?.email || 'unknown-email'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border border-border bg-background px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">Runs</p>
                    <p className="text-sm font-semibold text-foreground">{profile?.totalRuns ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">Avg Confidence</p>
                    <p className="text-sm font-semibold text-foreground">{Math.round(profile?.averageConfidence ?? 0)}%</p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-2 py-2">
                    <p className="text-[11px] text-muted-foreground">Last Run</p>
                    <p className="text-sm font-semibold text-foreground">{profile?.lastRunAt ? new Date(profile.lastRunAt).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Preferences</p>
                  <p className="text-xs text-muted-foreground">These settings are stored backend per user.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Theme</label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value: UserSettings['theme']) => patchSetting('theme', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Default task type</label>
                  <Select
                    value={settings.defaultTaskType}
                    onValueChange={(value: TaskType) => patchSetting('defaultTaskType', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_OPTIONS.map((task) => (
                        <SelectItem key={task} value={task}>
                          {task}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">Auto run compare</p>
                    <p className="text-xs text-muted-foreground">Run immediately when prompt is submitted.</p>
                  </div>
                  <Switch checked={settings.autoRun} onCheckedChange={(checked) => patchSetting('autoRun', checked)} />
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">Compact panel</p>
                    <p className="text-xs text-muted-foreground">Reduce dashboard spacing in stats panel.</p>
                  </div>
                  <Switch checked={settings.compactView} onCheckedChange={(checked) => patchSetting('compactView', checked)} />
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => void handleSave()} disabled={saving || loading}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save settings
                  </Button>
                  {success && <p className="text-xs text-primary">{success}</p>}
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4 flex flex-col gap-3 min-h-[360px]">
              <div>
                <p className="text-sm font-semibold text-foreground">Backend Activity</p>
                <p className="text-xs text-muted-foreground">Recent user-level events logged by the server.</p>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading activity...
                </div>
              ) : activity.length ? (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {activity.map((item) => (
                    <div key={item.id} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">{item.eventType}</p>
                        <p className="text-[11px] text-muted-foreground">{item.statusCode ?? '-'}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-1">{item.route}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground text-center">
                  No activity yet. Actions like compare, settings, and exports will appear here.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
