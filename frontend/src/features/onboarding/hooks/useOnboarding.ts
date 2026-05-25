import { useCallback, useMemo, useState } from 'react'
import type { BusinessSize, BusinessType, RoleSetupItemDto, RoleTemplateDto } from '../../../shared/api/tenantRoles'
import type { RoleProfile } from '../../../shared/types/roleProfiles'

export type OnboardingStepId = 'size' | 'type' | 'staff' | 'finetune' | 'review' | 'invite'

export interface OnboardingRoleState {
  name: string
  description: string
  emoji: string
  colour: string
  isOwner: boolean
  alwaysPermissions: string[]
  optionalPermissions: string[]
  enabledOptional: string[]
  custom: boolean
  roleProfile?: RoleProfile
}

function visibleSteps(size: BusinessSize | null): OnboardingStepId[] {
  if (size === 'SOLO') {
    return ['size', 'review', 'invite']
  }
  return ['size', 'type', 'staff', 'finetune', 'review', 'invite']
}

function templateToRoleState(template: RoleTemplateDto): OnboardingRoleState {
  return {
    name: template.name,
    description: template.description,
    emoji: template.emoji,
    colour: template.colour,
    isOwner: template.isOwner,
    alwaysPermissions: [...template.alwaysPermissions],
    optionalPermissions: [...template.optionalPermissions],
    enabledOptional: [],
    custom: false,
    roleProfile: template.roleProfile,
  }
}

export function useOnboarding() {
  const [businessSize, setBusinessSize] = useState<BusinessSize | null>(null)
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<OnboardingRoleState[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [fineTuneRoleIndex, setFineTuneRoleIndex] = useState(0)
  const [reviewEditRoleIndex, setReviewEditRoleIndex] = useState<number | null>(null)

  const steps = useMemo(() => visibleSteps(businessSize), [businessSize])
  const currentStep = steps[stepIndex] ?? 'size'

  const rolesNeedingFineTune = useMemo(
    () =>
      selectedRoles
        .map((role, index) => ({ role, index }))
        .filter(({ role }) => !role.isOwner && role.optionalPermissions.length > 0),
    [selectedRoles],
  )

  const setSize = useCallback((size: BusinessSize) => {
    setBusinessSize(size)
  }, [])

  const setType = useCallback((type: BusinessType) => {
    setBusinessType(type)
  }, [])

  const applyTemplates = useCallback((templates: RoleTemplateDto[]) => {
    setSelectedRoles(templates.map(templateToRoleState))
  }, [])

  const toggleRoleSelection = useCallback((template: RoleTemplateDto) => {
    if (template.isOwner) {
      return
    }
    setSelectedRoles((prev) => {
      if (prev.some((r) => r.name === template.name)) {
        return prev.filter((r) => r.name !== template.name || r.isOwner)
      }
      return [...prev, templateToRoleState(template)]
    })
  }, [])

  const selectAllTemplates = useCallback((templates: RoleTemplateDto[]) => {
    setSelectedRoles(templates.map(templateToRoleState))
  }, [])

  const addCustomRole = useCallback((name: string, suggestedOptional: string[]) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    setSelectedRoles((prev) => {
      if (prev.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev
      }
      const always = ['POS_ACCESS', 'EBM_SUBMIT'].filter((c) => suggestedOptional.includes(c) || true)
      const optional = suggestedOptional.filter((c) => !always.includes(c))
      return [
        ...prev,
        {
          name: trimmed,
          description: `Custom role: ${trimmed}`,
          emoji: '🎯',
          colour: '#6366f1',
          isOwner: false,
          alwaysPermissions: always.slice(0, 2),
          optionalPermissions: optional.length > 0 ? optional : ['INVENTORY_READ', 'FINANCE_READ', 'AI_COPILOT'],
          enabledOptional: [],
          custom: true,
          roleProfile: undefined,
        },
      ]
    })
  }, [])

  const updateRole = useCallback((index: number, changes: Partial<OnboardingRoleState>) => {
    setSelectedRoles((prev) => prev.map((role, i) => (i === index ? { ...role, ...changes } : role)))
  }, [])

  const setOptionalAnswer = useCallback((roleIndex: number, code: string, enabled: boolean) => {
    setSelectedRoles((prev) =>
      prev.map((role, i) => {
        if (i !== roleIndex) {
          return role
        }
        const enabledOptional = enabled
          ? [...new Set([...role.enabledOptional, code])]
          : role.enabledOptional.filter((c) => c !== code)
        return { ...role, enabledOptional }
      }),
    )
  }, [])

  const buildRequest = useCallback((): { size: BusinessSize; type: BusinessType; roles: RoleSetupItemDto[] } => {
    const size = businessSize ?? 'SMALL'
    const type = businessType ?? 'RETAIL'
  const roles: RoleSetupItemDto[] = selectedRoles.map((role) => {
      const permissionCodes = [
        ...role.alwaysPermissions,
        ...role.enabledOptional.filter((c) => role.optionalPermissions.includes(c)),
      ]
      return {
        name: role.name,
        description: role.description,
        emoji: role.emoji,
        colour: role.colour,
        permissionCodes: [...new Set(permissionCodes)],
        isOwner: role.isOwner,
        roleProfile: role.roleProfile,
      }
    })
    return { size, type, roles }
  }, [businessSize, businessType, selectedRoles])

  const goToReviewEdit = useCallback(
    (roleIndex: number) => {
      const ftIndex = rolesNeedingFineTune.findIndex(({ index }) => index === roleIndex)
      setReviewEditRoleIndex(roleIndex)
      if (ftIndex >= 0) {
        setFineTuneRoleIndex(ftIndex)
        setStepIndex(steps.indexOf('finetune'))
      }
    },
    [rolesNeedingFineTune, steps],
  )

  const nextStep = useCallback(() => {
    if (currentStep === 'finetune') {
      if (fineTuneRoleIndex < rolesNeedingFineTune.length - 1) {
        setFineTuneRoleIndex((i) => i + 1)
        return
      }
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1)
      if (steps[stepIndex + 1] === 'finetune') {
        setFineTuneRoleIndex(0)
      }
    }
  }, [currentStep, fineTuneRoleIndex, rolesNeedingFineTune.length, stepIndex, steps])

  const prevStep = useCallback(() => {
    if (currentStep === 'finetune' && fineTuneRoleIndex > 0) {
      setFineTuneRoleIndex((i) => i - 1)
      return
    }
    if (stepIndex > 0) {
      const prev = stepIndex - 1
      setStepIndex(prev)
      if (steps[prev] === 'finetune' && rolesNeedingFineTune.length > 0) {
        setFineTuneRoleIndex(rolesNeedingFineTune.length - 1)
      }
    }
  }, [currentStep, fineTuneRoleIndex, rolesNeedingFineTune.length, stepIndex, steps])

  const skipFineTuneIfEmpty = useCallback(() => {
    if (rolesNeedingFineTune.length === 0 && currentStep === 'staff') {
      setStepIndex(steps.indexOf('review'))
    }
  }, [currentStep, rolesNeedingFineTune.length, steps])

  return {
    businessSize,
    businessType,
    selectedRoles,
    steps,
    stepIndex,
    currentStep,
    fineTuneRoleIndex,
    rolesNeedingFineTune,
    reviewEditRoleIndex,
    setSize,
    setType,
    applyTemplates,
    toggleRoleSelection,
    selectAllTemplates,
    addCustomRole,
    updateRole,
    setOptionalAnswer,
    buildRequest,
    nextStep,
    prevStep,
    goToReviewEdit,
    skipFineTuneIfEmpty,
    setStepIndex,
  }
}

export type OnboardingState = ReturnType<typeof useOnboarding>
