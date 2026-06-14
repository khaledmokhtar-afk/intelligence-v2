import Link from 'next/link'

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(0,200,232,0.08)', paddingTop: 48, paddingBottom: 48, marginTop: 80 }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, color: '#E2EEF8' }}>FormForge</p>
          <p style={{ color: '#6B8FAF', fontSize: 14, marginTop: 4 }}>PDF to 3D CAD — powered by Claude AI</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['API', '/api-docs']].map(([label, href]) => (
            <Link key={href} href={href} style={{ color: '#6B8FAF', fontSize: 14, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E2EEF8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B8FAF')}>
              {label}
            </Link>
          ))}
          <a href="mailto:hello@formforge.io" style={{ color: '#6B8FAF', fontSize: 14, textDecoration: 'none' }}>Contact</a>
        </div>
        <p style={{ color: '#344B63', fontSize: 14 }}>© 2025 FormForge. All rights reserved.</p>
      </div>
    </footer>
  )
}
