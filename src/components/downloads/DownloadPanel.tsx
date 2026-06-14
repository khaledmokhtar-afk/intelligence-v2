interface DownloadFile {
  format:      string
  label:       string
  description: string
  icon:        string
  url?:        string
  extension:   string
}

interface Props {
  outputUrls: Record<string, string | undefined>
  inputName:  string
}

export function DownloadPanel({ outputUrls, inputName }: Props) {
  const baseName = inputName.replace(/\.pdf$/i, '')

  const files: DownloadFile[] = [
    { format: 'dxf',  label: 'DXF File',    description: 'AutoCAD, Civil 3D, LibreCAD',     icon: '⬡', url: outputUrls.dxf,  extension: 'dxf' },
    { format: 'obj',  label: 'OBJ File',    description: 'Blender, Maya, 3ds Max',           icon: '◈', url: outputUrls.obj,  extension: 'obj' },
    { format: 'gltf', label: 'GLTF Model',  description: 'Three.js, Unity, Unreal, web 3D', icon: '◉', url: outputUrls.gltf, extension: 'glb' },
  ]

  return (
    <div className="card" style={{ padding: 24 }}>
      <span className="section-label">Downloads</span>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 20px' }}>
        Files are available for 7 days. Links expire after that.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {files.map((file) => (
          <div key={file.format} style={{
            border: '1px solid rgba(0,200,232,0.12)', borderRadius: 12, padding: 20,
            display: 'flex', flexDirection: 'column', gap: 16,
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,200,232,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,200,232,0.12)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(0,200,232,0.08)', border: '1px solid rgba(0,200,232,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'var(--color-cyan)',
              }}>
                {file.icon}
              </div>
              <div>
                <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 14, margin: 0 }}>{file.label}</p>
                <p style={{ color: 'var(--color-text-dim)', fontSize: 12, margin: '2px 0 0' }}>{file.description}</p>
              </div>
            </div>
            {file.url ? (
              <a
                href={file.url}
                download={`${baseName}.${file.extension}`}
                className="btn-primary"
                style={{ textAlign: 'center', textDecoration: 'none', padding: '8px 16px', fontSize: 14 }}
              >
                Download
              </a>
            ) : (
              <div style={{
                background: 'var(--color-surface)', border: '1px solid rgba(0,200,232,0.06)',
                borderRadius: 8, padding: '8px 16px', color: 'var(--color-text-dim)',
                fontSize: 14, textAlign: 'center',
              }}>
                Not available
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
