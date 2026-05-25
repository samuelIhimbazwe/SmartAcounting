import { apiClient } from './client'

export interface LocationDto {
  id: string
  name: string
  locationCode?: string
  currencyDefault?: string
}

export interface RegisterDto {
  id: string
  name: string
  locationId: string
}

export async function listLocations(): Promise<LocationDto[]> {
  const { data } = await apiClient.get<LocationDto[]>('/api/v1/locations')
  return data
}

export async function listRegisters(locationId: string): Promise<RegisterDto[]> {
  const { data } = await apiClient.get<RegisterDto[]>(`/api/v1/locations/${locationId}/registers`)
  return data
}
