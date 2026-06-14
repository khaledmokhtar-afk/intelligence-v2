'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Upload, Cpu, Box, Download, ChevronDown } from 'lucide-react'

// ─── Hero 3D Wireframe Animation ─────────────────────────────────────────────
function WireframeAnimation() {
  return (
    <div style={{ width: 320, height: 260, position: 'relative', margin: '0 auto' }}>
      <style>{`
        @keyframes lift3d {
          0%  { transform: perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px); opacity: 0.4; }
          40% { transform: perspective(600px) rotateX(0deg) rotateY(0deg) translateZ(0px); opacity: 1; }
          70% { transform: perspective(600px) rotateX(-22deg) rotateY(25deg) translateZ(40px); opacity: 1; }
          100%{ transform: perspective(600px) rotateX(-22deg) rotateY(25deg) translateZ(40px); opacity: 1; }
        }
        @keyframes scanLine {
          0%   { top: 0; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .wireframe-box {
          position: absolute; inset: 30px 40px;
          border: 2px solid rgba(0,200,232,0.7);
          border-radius: 4px;
          animation: lift3d 3s ease-in-out infinite alternate;
          background: rgba(0,200,232,0.03);
          box-shadow: 0 0 30px rgba(0,200,232,0.15), inset 0 0 20px rgba(0,200,232,0.05);
        }
        .wireframe-box::before {
          content: ''; position: absolute; inset: 8px;
          border: 1px solid rgba(0,200,232,0.2);
          border-radius: 2px;
        }
        .wireframe-edges {
          position: absolute; inset: 30px 40px;
          pointer-events: none;
        }
        .scan-bar {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #00C8E8, transparent);
          animation: scanLine 2s linear infinite;
          animation-delay: 1.5s;
        }
        .corner-dot {
          position: absolute; width: 6px; height: 6px;
          border-radius: 50%; background: #00C8E8;
          box-shadow: 0 0 8px #00C8E8;
        }
        @keyframes gridAppear {
          0%, 40%   { opacity: 0; }
          70%, 100% { opacity: 1; }
        }
        .grid-lines {
          position: absolute; inset: 0; opacity: 0;
          animation: gridAppear 3s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Flat PDF rect that lifts into 3D box */}
      <div className="wireframe-box">
        <div className="scan-bar" />
        <div className="corner-dot" style={{ top: -3, left: -3 }} />
        <div className="corner-dot" style={{ top: -3, right: -3 }} />
        <div className="corner-dot" style={{ bottom: -3, left: -3 }} />
        <div className="corner-dot" style={{ bottom: -3, right: -3 }} />

        {/* Interior grid lines */}
        <div className="grid-lines">
          {[25, 50, 75].map(p => (
            <div key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(0,200,232,0.15)' }} />
          ))}
          {[33, 66].map(p => (
            <div key={p} style={{ position: 'absolute', top: `${p}%`, left: 0, right: 0, borderTop: '1px solid rgba(0,200,232,0.15)' }} />
          ))}
        </div>
      </div>

      {/* Label */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00C8E8', letterSpacing: '0.1em' }}>
        PDF → 3D MODEL
      </div>
    </div>
  )
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What file formats does FormForge accept?',
    a: 'FormForge accepts PDF files containing 2D engineering drawings. This includes architectural floor plans, mechanical assembly drawings, structural drawings, and civil engineering plans. Scanned drawings (rasterized PDFs) are also supported with reduced accuracy.',
  },
  {
    q: 'How accurate is the 3D conversion?',
    a: 'Accuracy depends on drawing clarity. Well-drafted digital drawings (vector PDFs with clear annotations) achieve very high accuracy. Claude Vision extracts walls, dimensions, room labels, and structural elements, then normalises them into a clean 3D geometry. Scanned or low-quality PDFs will have lower accuracy.',
  },
  {
    q: 'How long does processing take?',
    a: 'Most drawings are fully processed in under 2 minutes. Complex multi-page drawings or large PDFs may take up to 5 minutes. You\'ll see live progress updates on your job page while processing runs.',
  },
  {
    q: 'What CAD software are the exports compatible with?',
    a: 'DXF files open in AutoCAD, BricsCAD, LibreCAD, and most other CAD packages. OBJ files work in Blender, SketchUp, 3ds Max, and Rhino. GLTF/GLB files are compatible with Blender, Unity, Unreal Engine, and any WebGL viewer.',
  },
  {
    q: 'Do I need an account?',
    a: 'No account is required for your first 3 jobs (1 page each). After that, sign in to purchase credits and process more drawings. Credits never expire.',
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {FAQS.map((faq, i) => (
        <div key={i} style={{ borderBottom: '1px solid rgba(0,200,232,0.1)', overflow: 'hidden' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', textAlign: 'left', padding: '20px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              color: '#E2EEF8', fontSize: 16, fontFamily: 'Inter, sans-serif',
            }}
          >
            <span style={{ fontWeight: 500 }}>{faq.q}</span>
            <ChevronDown
              size={18}
              color="#6B8FAF"
              style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 16 }}
            />
          </button>
          {open === i && (
            <div style={{ paddingBottom: 20, color: '#6B8FAF', fontSize: 15, lineHeight: 1.7 }}>
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({
  name, credits, price, description, highlight, label,
}: { name: string; credits: number; price: number; description: string; highlight: boolean; label?: string }) {
  return (
    <div style={{
      position: 'relative',
      background: highlight ? 'linear-gradient(135deg, rgba(0,200,232,0.08), rgba(139,92,246,0.08))' : '#101E35',
      border: `1px solid ${highlight ? 'rgba(0,200,232,0.45)' : 'rgba(0,200,232,0.12)'}`,
      borderRadius: 16,
      padding: 32,
      boxShadow: highlight ? '0 0 40px rgba(0,200,232,0.15)' : 'none',
      transition: 'all 0.2s',
    }}>
      {label && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(90deg, #00C8E8, #8B5CF6)',
          color: '#03070F', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
          padding: '4px 14px', borderRadius: 99, letterSpacing: '0.1em', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      )}

      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 20, color: '#E2EEF8', marginBottom: 8 }}>{name}</p>
      <p style={{ color: '#6B8FAF', fontSize: 14, marginBottom: 24 }}>{description}</p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 42, color: '#E2EEF8' }}>${price}</span>
      </div>
      <p style={{ color: '#6B8FAF', fontSize: 14, marginBottom: 8 }}>{credits} credits</p>
      <p style={{ color: '#344B63', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 28 }}>1 credit per page processed</p>

      <Link href="/dashboard/credits" className="btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex' }}>
        Buy {name}
      </Link>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const steps = [
    { num: '01', icon: <Upload size={22} color="#00C8E8" />, title: 'Upload PDF', body: 'Drop your 2D drawing. We accept architectural, mechanical, structural, and civil PDFs.' },
    { num: '02', icon: <Cpu size={22} color="#00C8E8" />, title: 'AI Parses', body: 'Claude Vision reads every line, dimension, and annotation from your drawing.' },
    { num: '03', icon: <Box size={22} color="#00C8E8" />, title: '3D Generated', body: 'Your geometry is extruded into a full 3D model with room recognition and material hints.' },
    { num: '04', icon: <Download size={22} color="#00C8E8" />, title: 'Download CAD', body: 'Get DXF, OBJ, and GLTF files ready for AutoCAD, Blender, or your CAD tool of choice.' },
  ]

  const packs = [
    { name: 'Starter', credits: 5, price: 9, description: 'For occasional use', highlight: false },
    { name: 'Professional', credits: 20, price: 25, description: 'Most popular for active projects', highlight: true, label: 'MOST POPULAR' },
    { name: 'Studio', credits: 100, price: 79, description: 'For teams and heavy workloads', highlight: false },
  ]

  return (
    <div>
      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px 60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background gradients */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, background: 'radial-gradient(ellipse, rgba(0,200,232,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '20%', right: '-5%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, textAlign: 'center' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 99,
            border: '1px solid rgba(0,200,232,0.2)', background: 'rgba(0,200,232,0.05)',
            color: '#00C8E8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
            marginBottom: 40, letterSpacing: '0.05em',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C8E8', display: 'inline-block', animation: 'pulse-ring 2s ease-in-out infinite' }} />
            AI-powered drawing conversion
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
            fontSize: 'clamp(48px, 8vw, 80px)', lineHeight: 1.05,
            color: '#E2EEF8', margin: '0 0 16px',
          }}>
            From flat to form.
          </h1>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600,
            fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1,
            color: '#6B8FAF', margin: '0 0 28px',
          }}>
            Instantly.
          </h2>
          <p style={{ color: '#6B8FAF', fontSize: 18, lineHeight: 1.65, maxWidth: 560, margin: '0 auto 40px' }}>
            Upload any 2D engineering drawing and get a full 3D model with DXF, OBJ, and GLTF export in under 2 minutes.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 32 }}>
            <Link href="/dashboard/new" className="btn-primary" style={{ fontSize: 17, padding: '14px 32px', textDecoration: 'none' }}>
              Convert a drawing free →
            </Link>
            <a href="#how-it-works" className="btn-ghost" style={{ fontSize: 17, padding: '14px 32px' }}>
              See how it works ↓
            </a>
          </div>

          {/* Trust indicators */}
          <p style={{ color: '#344B63', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
            No account needed · Supports architectural, mechanical &amp; civil · Powered by Claude AI
          </p>
        </div>

        {/* Hero Visual */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 60 }}>
          <WireframeAnimation />
        </div>
      </section>

      {/* ── Section 2: How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span className="section-label">THE PIPELINE</span>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 40, color: '#E2EEF8', margin: 0 }}>
            Four steps. Two minutes.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, position: 'relative' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div className="card card-hover" style={{ padding: 28, height: '100%' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00C8E8',
                  letterSpacing: '0.15em', marginBottom: 16,
                }}>
                  STEP {step.num}
                </div>
                <div style={{ marginBottom: 16 }}>{step.icon}</div>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 18, color: '#E2EEF8', marginBottom: 10 }}>
                  {step.title}
                </h3>
                <p style={{ color: '#6B8FAF', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{step.body}</p>
              </div>

              {/* Animated connector (not after last) */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: '50%', right: -16, transform: 'translateY(-50%)',
                  display: 'none', // hidden on mobile; show on desktop via inline hack
                  color: '#00C8E8', fontSize: 18, zIndex: 2,
                }}>
                  <svg width="32" height="2" style={{ display: 'block' }}>
                    <line x1="0" y1="1" x2="32" y2="1" stroke="rgba(0,200,232,0.4)" strokeWidth="1.5" strokeDasharray="4 3" style={{ animation: 'data-flow 1.5s linear infinite' }} />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Formats ──────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 900, margin: '0 auto' }}>
        <div className="card" style={{ padding: '48px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center' }}>
            {/* Input */}
            <div>
              <span className="section-label">WHAT YOU UPLOAD</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <div style={{ width: 48, height: 60, border: '2px solid rgba(0,200,232,0.3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,200,232,0.04)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00C8E8' }}>PDF</span>
                </div>
                <div>
                  <p style={{ color: '#E2EEF8', fontWeight: 500, marginBottom: 4 }}>Engineering PDF</p>
                  <p style={{ color: '#6B8FAF', fontSize: 13 }}>Any 2D drawing, any discipline</p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', color: '#00C8E8', fontSize: 28 }}>→</div>

            {/* Output */}
            <div>
              <span className="section-label">WHAT YOU GET</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                {[['DXF', 'AutoCAD'], ['OBJ', 'Blender'], ['GLTF', 'WebGL'], ['PNG', 'Preview']].map(([fmt, note]) => (
                  <div key={fmt} style={{
                    padding: '8px 16px', border: '1px solid rgba(0,200,232,0.25)',
                    borderRadius: 8, background: 'rgba(0,200,232,0.04)',
                  }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#00C8E8' }}>{fmt}</div>
                    <div style={{ fontSize: 11, color: '#6B8FAF', marginTop: 2 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Pricing ──────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="section-label">CREDITS</span>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 40, color: '#E2EEF8', margin: 0 }}>
            Simple credit pricing
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 40 }}>
          {packs.map(p => <PricingCard key={p.name} {...p} label={(p as { label?: string }).label} />)}
        </div>

        <p style={{ textAlign: 'center', color: '#6B8FAF', fontSize: 15 }}>
          Or try free — no account needed.{' '}
          <span style={{ color: '#E2EEF8' }}>First 3 jobs free (1 page each).</span>
        </p>
      </section>

      {/* ── Section 5: FAQ ──────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 120px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="section-label">FAQ</span>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 40, color: '#E2EEF8', margin: 0 }}>
            Common questions
          </h2>
        </div>
        <FAQ />
      </section>
    </div>
  )
}
