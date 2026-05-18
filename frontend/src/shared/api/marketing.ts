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

export async function listCampaigns(page = 0, size = 50): Promise<CampaignRow[]> {
  const { data } = await apiClient.get<{ content?: CampaignRow[] } | CampaignRow[]>(
    '/marketing/campaigns',
    { params: { page, size } },
  )
  if (Array.isArray(data)) return data
  return data.content ?? []
}

export async function listPromotions(page = 0, size = 50): Promise<PromotionRow[]> {
  const { data } = await apiClient.get<{ content?: PromotionRow[] } | PromotionRow[]>(
    '/promotions',
    { params: { page, size } },
  )
  return Array.isArray(data) ? data : (data.content ?? [])
}

export async function listSegments(): Promise<Array<{ segment: string; customerCount: number }>> {
  const { data } = await apiClient.get<Array<{ segment: string; customerCount: number }>>(
    '/marketing/segments',
  )
  return data
}
