import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          AI-powered drawing conversion
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-text-primary mb-6">
          2D drawings →{' '}
          <span className="text-cyan">3D models</span>
        </h1>

        <p className="text-xl text-text-muted max-w-xl mx-auto mb-10">
          Upload any PDF engineering drawing. FormForge converts it to a 3D model,
          DXF, and OBJ in minutes using Claude AI.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/new" className="btn-primary px-8 py-3 text-base">
            Convert a drawing →
          </Link>
          <Link href="/auth/signin" className="btn-secondary px-8 py-3 text-base">
            Sign in
          </Link>
        </div>

        <p className="text-text-dim text-sm mt-8">
          Supports architectural, mechanical, structural &amp; civil drawings
        </p>
      </div>
    </main>
  )
}
