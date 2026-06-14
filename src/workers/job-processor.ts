import { prisma }       from '@/lib/prisma'
import { parsePDF }     from './stages/01-parse-pdf'
import { reasonLayout } from './stages/02-reason-layout'
import { generate3D }   from './stages/03-generate-3d'
import { exportCAD }    from './stages/04-export-cad'

export async function processJob(jobId: string, inputKey: string, pagesCount: number) {
  const setStage = async (stage: number) => {
    await prisma.job.update({
      where: { id: jobId },
      data:  { stage, status: 'PROCESSING' },
    })
  }

  const setFailed = async (errorMsg: string) => {
    await prisma.job.update({
      where: { id: jobId },
      data:  { status: 'FAILED', errorMsg },
    })
  }

  const startMs = Date.now()

  try {
    // Stage 1: Parse PDF with Claude Vision
    await setStage(1)
    const parsedData = await parsePDF(jobId, inputKey)
    await prisma.job.update({
      where: { id: jobId },
      data:  { parsedData: parsedData as object, drawingType: parsedData.drawingType },
    })

    // Stage 2: Reason about layout with Claude Text
    await setStage(2)
    const geometryData = await reasonLayout(jobId, parsedData)
    await prisma.job.update({
      where: { id: jobId },
      data:  { geometryData: geometryData as object },
    })

    // Stage 3: Generate 3D model
    await setStage(3)
    const gltfKey = await generate3D(jobId, geometryData)

    // Stage 4: Export CAD files
    await setStage(4)
    const outputKeys = await exportCAD(jobId, geometryData, gltfKey)

    // Mark complete
    await prisma.job.update({
      where: { id: jobId },
      data:  {
        status:       'COMPLETE',
        stage:        4,
        outputKeys,
        processingMs: Date.now() - startMs,
        completedAt:  new Date(),
      },
    })

    console.log(`Job ${jobId} complete in ${Date.now() - startMs}ms`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Job ${jobId} failed at stage:`, msg)
    await setFailed(msg)
    throw err // re-throw for BullMQ retry
  }
}
