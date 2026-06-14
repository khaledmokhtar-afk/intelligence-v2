import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'FormForge — 2D to 3D Drawing Converter',
  description: 'Convert 2D PDF engineering drawings to 3D models and CAD files instantly.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
