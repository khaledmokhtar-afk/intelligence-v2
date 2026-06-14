import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'FormForge — PDF to 3D CAD',
  description: 'Convert 2D engineering drawings into 3D models and CAD files using AI.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', margin: 0 }}>
        <Providers>
          <Navbar />
          <main style={{ paddingTop: 64 }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
