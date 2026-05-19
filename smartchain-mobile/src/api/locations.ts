import {apiCall} from './client';

export type LocationDto = {
  id: string;
  name: string;
  locationCode?: string;
  currencyDefault?: string;
  address?: string;
  timezone?: string;
  active?: boolean;
};

export type RegisterDto = {
  id: string;
  locationId: string;
  name: string;
  hardwareId?: string;
  active?: boolean;
};

export async function fetchLocations(): Promise<LocationDto[]> {
  return apiCall<LocationDto[]>('/locations');
}

export async function fetchRegisters(locationId: string): Promise<RegisterDto[]> {
  return apiCall<RegisterDto[]>(`/locations/${locationId}/registers`);
}
