// app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MediFi Voice - AI-Powered Voice Intelligence System',
  description: 'Transform voice consultations into actionable insights for Healthcare and Finance professionals.',
  keywords: ['voice AI', 'healthcare', 'finance', 'consultation', 'medical records', 'NER'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}