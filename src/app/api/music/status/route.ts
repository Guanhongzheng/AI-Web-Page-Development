import { ok, handleApiError } from '@/lib/api'
import { checkNeteaseStatus, NETEASE_BASE } from '@/lib/netease'

export async function GET() {
  try {
    const status = await checkNeteaseStatus()
    return ok({ ...status, base: NETEASE_BASE })
  } catch (e) {
    return handleApiError(e)
  }
}
