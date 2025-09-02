'use client'

import { useEffect, useState } from 'react'

interface DemoCredentialsProps {
  className?: string
}

export function DemoCredentials({ className = '' }: DemoCredentialsProps) {
  const [showDemo, setShowDemo] = useState(false)
  const [demoEmail, setDemoEmail] = useState('')
  
  useEffect(() => {
    // Only show demo credentials in development mode
    // and when explicitly enabled via environment variable
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNT === 'true' &&
      process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL
    ) {
      setShowDemo(true)
      setDemoEmail(process.env.NEXT_PUBLIC_DEMO_ACCOUNT_EMAIL)
    }
  }, [])
  
  if (!showDemo) {
    return null
  }
  
  return (
    <div className={`mt-6 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Development Demo Account</span>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-gray-600">
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="font-semibold text-yellow-800 mb-1">⚠️ Development Only</p>
          <p>Email: {demoEmail}</p>
          <p className="text-gray-500 mt-1">Password is set in environment variables</p>
        </div>
      </div>
    </div>
  )
}