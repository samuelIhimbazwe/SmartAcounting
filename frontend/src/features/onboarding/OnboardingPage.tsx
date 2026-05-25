import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAuthMe } from '../../shared/api/auth'
import {
  fetchRoleSetupRecommendation,
  listPermissionCatalog,
  saveTenantRoleSetup,
  type TenantRoleDto,
} from '../../shared/api/tenantRoles'
import { getDefaultRoute } from '../../shared/routing/getDefaultRoute'
import { useAuthStore } from '../../shared/stores/authStore'
import { OnboardingShell } from './OnboardingShell'
import { useOnboarding, type OnboardingStepId } from './hooks/useOnboarding'
import { StepFineTune } from './steps/StepFineTune'
import { StepInvite } from './steps/StepInvite'
import { StepReview } from './steps/StepReview'
import { StepSize } from './steps/StepSize'
import { StepStaff } from './steps/StepStaff'
import { StepType } from './steps/StepType'

const INVITE_SESSION_KEY = 'onboarding-invite'

const STEP_COPY: Record<OnboardingStepId, { title: string; subtitle?: string }> = {
  size: { title: 'How big is your team?', subtitle: 'We will tailor roles to your size.' },
  type: { title: 'What kind of business?', subtitle: 'Different industries need different permissions.' },
  staff: { title: 'Who works with you?', subtitle: 'Pick the roles you need. You can add more later.' },
  finetune: { title: 'Fine-tune access', subtitle: 'Choose optional permissions for this role.' },
  review: { title: 'Does this look right?', subtitle: 'Review roles before saving.' },
  invite: { title: 'Invite your team', subtitle: 'Send invites now or skip and do it later.' },
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const tenantId = useAuthStore((s) => s.tenantId)
  const setRbac = useAuthStore((s) => s.setRbac)
  const setSetupComplete = useAuthStore((s) => s.setSetupComplete)

  const onboarding = useOnboarding()
  const {
    businessSize,
    businessType,
    selectedRoles,
    steps,
    stepIndex,
    currentStep,
    fineTuneRoleIndex,
    rolesNeedingFineTune,
    setSize,
    setType,
    applyTemplates,
    toggleRoleSelection,
    addCustomRole,
    updateRole,
    setOptionalAnswer,
    buildRequest,
    nextStep,
    prevStep,
    goToReviewEdit,
    setStepIndex,
  } = onboarding

  const [inviteRoles, setInviteRoles] = useState<TenantRoleDto[]>([])
  const soloMode = businessSize === 'SOLO'

  const catalogQuery = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: listPermissionCatalog,
  })

  const templatesQuery = useQuery({
    queryKey: ['role-setup-templates', businessSize, businessType],
    queryFn: () => fetchRoleSetupRecommendation(businessSize!, businessType ?? 'RETAIL'),
    enabled: !!businessSize && (!!businessType || businessSize === 'SOLO'),
  })

  const saveMutation = useMutation({
    mutationFn: () => saveTenantRoleSetup(buildRequest()),
    onSuccess: async (roles) => {
      setInviteRoles(roles)
      const profile = await fetchAuthMe()
      setRbac({
        permissions: profile.permissions,
        assignedRoles: profile.assignedRoles,
        role: profile.role,
        effectiveRoleProfile: profile.effectiveRoleProfile,
      })
      setSetupComplete(true)
      sessionStorage.setItem(INVITE_SESSION_KEY, '1')
      setStepIndex(steps.indexOf('invite'))
    },
  })

  const permissionCatalog = catalogQuery.data ?? []
  const templates = templatesQuery.data ?? []

  function finishOnboarding() {
    sessionStorage.removeItem(INVITE_SESSION_KEY)
    const { permissions, role } = useAuthStore.getState()
    navigate(getDefaultRoute(role, permissions, useAuthStore.getState().effectiveRoleProfile))
  }

  function handleSizeContinue() {
    if (soloMode && templatesQuery.data) {
      applyTemplates(templatesQuery.data)
    }
    nextStep()
  }

  function handleTypeContinue() {
    if (templatesQuery.data) {
      applyTemplates(templatesQuery.data)
    }
    nextStep()
  }

  function handleStaffContinue() {
    if (rolesNeedingFineTune.length === 0) {
      setStepIndex(steps.indexOf('review'))
      return
    }
    nextStep()
  }

  const fineTuneEntry = rolesNeedingFineTune[fineTuneRoleIndex]
  const fineTuneRole = fineTuneEntry?.role
  const fineTuneSelectedRoleIndex = fineTuneEntry?.index ?? 0

  let stepTitle = STEP_COPY[currentStep].title
  let stepSubtitle = STEP_COPY[currentStep].subtitle
  if (currentStep === 'finetune' && fineTuneRole) {
    stepTitle = `${fineTuneRole.emoji} ${fineTuneRole.name}`
  }

  function renderStep() {
    switch (currentStep) {
      case 'size':
        return <StepSize value={businessSize} onSelect={setSize} onContinue={handleSizeContinue} />
      case 'type':
        return <StepType value={businessType} onSelect={setType} onContinue={handleTypeContinue} />
      case 'staff':
        if (templatesQuery.isLoading) {
          return <p className="onboarding__subtitle">Loading recommended roles…</p>
        }
        return (
          <StepStaff
            templates={templates}
            selectedRoles={selectedRoles}
            permissionCatalog={permissionCatalog}
            onToggle={toggleRoleSelection}
            onAddCustom={addCustomRole}
            onContinue={handleStaffContinue}
          />
        )
      case 'finetune':
        if (!fineTuneRole) {
          return null
        }
        return (
          <StepFineTune
            role={fineTuneRole}
            roleIndex={fineTuneSelectedRoleIndex}
            page={fineTuneRoleIndex + 1}
            totalPages={rolesNeedingFineTune.length}
            permissionCatalog={permissionCatalog}
            onNameChange={(name) => updateRole(fineTuneSelectedRoleIndex, { name })}
            onOptionalAnswer={(code, enabled) => setOptionalAnswer(fineTuneSelectedRoleIndex, code, enabled)}
            onContinue={nextStep}
          />
        )
      case 'review':
        return (
          <StepReview
            roles={selectedRoles}
            soloMode={soloMode}
            permissionCatalog={permissionCatalog}
            saving={saveMutation.isPending}
            onEdit={goToReviewEdit}
            onRoleProfileChange={(index, roleProfile) => updateRole(index, { roleProfile })}
            onBack={prevStep}
            onConfirm={() => saveMutation.mutate()}
          />
        )
      case 'invite':
        return (
          <StepInvite
            roles={inviteRoles}
            tenantId={tenantId}
            onSkip={finishOnboarding}
            onDone={finishOnboarding}
          />
        )
      default:
        return null
    }
  }

  const showBack = stepIndex > 0 && currentStep !== 'invite'

  return (
    <OnboardingShell
      title={stepTitle}
      subtitle={stepSubtitle}
      stepIndex={stepIndex}
      totalSteps={steps.length}
      showBack={showBack}
      onBack={prevStep}
    >
      {saveMutation.isError ? (
        <p className="onboarding-invite__error">{(saveMutation.error as Error).message}</p>
      ) : null}
      {renderStep()}
    </OnboardingShell>
  )
}
