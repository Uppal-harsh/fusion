'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FallingRaysProps {
  color1?: string
  color2?: string
  rayCount?: number
  rayWidth?: number
  pulseSpeed?: number
  pulseWidth?: number
  trailLength?: number
  className?: string
}

export default function FallingRays({
  color1 = '#fbbf24', // Amber-400
  color2 = '#d97706', // Amber-600
  rayCount = 40,
  rayWidth = 1,
  pulseSpeed = 2,
  pulseWidth = 150,
  trailLength = 400,
  className
}: FallingRaysProps) {
  const [rays, setRays] = useState<any[]>([])

  useEffect(() => {
    setRays(Array.from({ length: rayCount }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      duration: pulseSpeed + Math.random() * 2,
      delay: Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.4,
      width: rayWidth + Math.random() * 2
    })))
  }, [rayCount, pulseSpeed, rayWidth])

  if (rays.length === 0) return null // Prevents hydration mismatch by not rendering rays on the server

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {rays.map((ray) => (
        <div
          key={ray.id}
          className="absolute top-0 h-full"
          style={{
            left: `${ray.x}%`,
            width: `${ray.width}px`,
            opacity: ray.opacity,
          }}
        >
          {/* Static Ray Path */}
          <div 
            className="absolute inset-x-0 h-full w-full" 
            style={{ 
              background: `linear-gradient(to bottom, transparent, ${color1}22, transparent)`,
              filter: 'blur(1px)'
            }} 
          />
          
          {/* Falling Pulse */}
          <motion.div
            className="absolute inset-x-0 w-full"
            style={{
              height: pulseWidth,
              background: `linear-gradient(to bottom, transparent, ${color2}, ${color1}, transparent)`,
              filter: 'blur(2px)',
              boxShadow: `0 0 15px 2px ${color1}66`
            }}
            initial={{ top: '-20%' }}
            animate={{ top: '120%' }}
            transition={{
              duration: ray.duration,
              repeat: Infinity,
              delay: ray.delay,
              ease: 'linear',
            }}
          />
        </div>
      ))}
      
      {/* Background Glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% -20%, oklch(0.78 0.13 75 / 0.05) 0%, transparent 70%)'
        }}
      />
    </div>
  )
}
