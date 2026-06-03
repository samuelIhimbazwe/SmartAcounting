import { ROLE_KPI_SLOTS, type KpiSlot } from '../config/roleKpiSlots'
import { pickKpiForSlot } from './dashboardFormat'
import type { KPIItem } from '../../../shared/types/dashboard'
import type { Role } from '../../../shared/types/roles'

export interface ResolvedKpiSlot {
  slot: KpiSlot
  kpi: KPIItem | null
}

export function resolveRoleKpiSlots(role: Role, kpis: KPIItem[]): ResolvedKpiSlot[] {
  const slots = ROLE_KPI_SLOTS[role]
  return slots.map((slot) => ({
    slot,
    kpi: pickKpiForSlot(kpis, slot.hints, slot.fallbackIndex) ?? null,
  }))
}
