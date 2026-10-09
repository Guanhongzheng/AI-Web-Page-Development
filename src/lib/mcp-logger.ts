import { prisma } from './db'
import { logger } from './logger'

export async function logMcpCall(
  userId: string | null,
  toolName: string,
  input: unknown,
  output: unknown,
  duration?: number,
  status: 'success' | 'error' = 'success',
) {
  try {
    await prisma.mcpLog.create({
      data: {
        userId,
        toolName,
        input: input as never,
        output: output as never,
        status,
        duration,
      },
    })
  } catch (e) {
    logger.warn('mcp log failed', (e as Error).message)
  }
}
