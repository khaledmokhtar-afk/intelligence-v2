import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import { DropZone }          from '@/components/upload/DropZone'

export default async function NewJobPage() {
  const session = await getServerSession(authOptions)
  const user    = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">New conversion</h1>
        <p className="text-text-muted mt-1">Upload your 2D PDF engineering drawing</p>
      </div>

      <DropZone userCredits={user?.credits ?? 0} />

      <div className="card p-5 text-sm text-text-muted space-y-2">
        <p className="font-medium text-text-primary text-base">What happens next</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Claude Vision reads your drawing page by page</li>
          <li>Claude reasons about walls, rooms, and geometry</li>
          <li>Three.js builds a 3D model (GLB/GLTF)</li>
          <li>DXF and OBJ files are exported for CAD use</li>
        </ol>
        <p className="text-text-dim text-xs pt-1">
          1 credit per page · max 50MB · architectural, mechanical, civil, structural
        </p>
      </div>
    </div>
  )
}
