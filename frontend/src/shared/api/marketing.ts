import { apiClient } from './client'

export interface CampaignRow {
  id: string
  name: string
  channel?: string
  status?: string
  budgetAmount?: number
  startDate?: string
  endDate?: string
}

export interface PromotionRow {
  id: string
  name: string
  code?: string
  status?: string
  discountType?: string
  discountValue?: number
}

function unwrapArrayResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const candidate of [record.content, record.items, record.rows, record.segments, record.campaigns]) {
      if (Array.isArray(candidate)) {
        return candidate as T[]
      }
    }
  }
  return []
}

export async function listCampaigns(page = 0, size = 50): Promise<CampaignRow[]> {
  const { data } = await apiClient.get<{ content?: CampaignRow[] } | CampaignRow[]>(
    '/marketing/campaigns',
    { params: { page, size } },
  )
  return unwrapArrayResponse<CampaignRow>(data)
}

export async function listPromotions(page = 0, size = 50): Promise<PromotionRow[]> {
  const { data } = await apiClient.get<{ content?: PromotionRow[] } | PromotionRow[]>(
    '/promotions',
    { params: { page, size } },
  )
  return unwrapArrayResponse<PromotionRow>(data)
}

export async function listSegments(): Promise<Array<{ segment: string; customerCount: number }>> {
  const { data } = await apiClient.get<unknown>(
    '/marketing/segments',
  )
  return unwrapArrayResponse<{ segment: string; customerCount: number }>(data)
}
