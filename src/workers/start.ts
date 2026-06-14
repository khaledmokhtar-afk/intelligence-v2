import { Worker } from 'bullmq'
import { redis } from '@/lib/redis'
import { processJob } from './job-processor'

console.log('FormForge worker starting...')

const worker = new Worker(
  'pdf-processing',
  async (job) => {
    console.log(`Processing job ${job.data.jobId} (attempt ${job.attemptsMade + 1})`)
    await processJob(job.data.jobId, job.data.inputKey, job.data.pagesCount)
  },
  {
    connection:  redis,
    concurrency: 2,
  }
)

worker.on('completed', (job) => console.log(`Job ${job.data.jobId} completed`))
worker.on('failed',    (job, err) => console.error(`Job ${job?.data.jobId} failed:`, err.message))

process.on('SIGTERM', async () => {
  await worker.close()
  process.exit(0)
})
