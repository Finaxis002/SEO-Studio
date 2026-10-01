'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { SWRConfig } from 'swr'
import { fetcher } from '@/lib/client'

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false, // Prevents aggressive network spam on window focus/tab switch
          revalidateIfStale: true,  // Render cached data immediately (0ms delay) THEN sync in background
          dedupingInterval: 4000,   // Deduplicate rapid tab switching within 4s, while ensuring live data stays fresh
          keepPreviousData: true,   // Seamless screen transitions without blank flicker
        }}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </SWRConfig>
    </ThemeProvider>
  )
}
