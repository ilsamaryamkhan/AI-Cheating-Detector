import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'atomcamp — AI Proctoring',
  description: 'AI-powered exam integrity detection system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}