'use client'

import { Chrome, Lock } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type GoogleAuthModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GoogleAuthModal({ open, onOpenChange }: GoogleAuthModalProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-md border-border/80 bg-card/95 backdrop-blur-md"
      >
        <DialogHeader className="items-center text-center space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">Sign in to continue</DialogTitle>
          <DialogDescription className="max-w-sm text-sm">
            Fusion requires a Google account before running model comparisons.
          </DialogDescription>
        </DialogHeader>

        <Button className="w-full" size="lg" onClick={() => void signIn('google')}>
          <Chrome className="h-4 w-4" />
          Sign in with Google
        </Button>
      </DialogContent>
    </Dialog>
  )
}
