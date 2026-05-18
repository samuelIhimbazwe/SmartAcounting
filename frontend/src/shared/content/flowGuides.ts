import type { FlowGuideStep } from '../components/ui/FlowGuide'

export const procurementFlowGuide = {
  titleKey: 'flowGuides.procurement.title',
  steps: [
    {
      titleKey: 'flowGuides.procurement.step1.title',
      bodyKey: 'flowGuides.procurement.step1.body',
    },
    {
      titleKey: 'flowGuides.procurement.step2.title',
      bodyKey: 'flowGuides.procurement.step2.body',
    },
    {
      titleKey: 'flowGuides.procurement.step3.title',
      bodyKey: 'flowGuides.procurement.step3.body',
    },
    {
      titleKey: 'flowGuides.procurement.step4.title',
      bodyKey: 'flowGuides.procurement.step4.body',
    },
  ] as const,
}

export const retailReceiveFlowGuide = {
  titleKey: 'flowGuides.retailReceive.title',
  steps: [
    { titleKey: 'flowGuides.retailReceive.step1.title', bodyKey: 'flowGuides.retailReceive.step1.body' },
    { titleKey: 'flowGuides.retailReceive.step2.title', bodyKey: 'flowGuides.retailReceive.step2.body' },
    { titleKey: 'flowGuides.retailReceive.step3.title', bodyKey: 'flowGuides.retailReceive.step3.body' },
  ] as const,
}

export const posCheckoutFlowGuide = {
  titleKey: 'flowGuides.pos.title',
  steps: [
    { titleKey: 'flowGuides.pos.step1.title', bodyKey: 'flowGuides.pos.step1.body' },
    { titleKey: 'flowGuides.pos.step2.title', bodyKey: 'flowGuides.pos.step2.body' },
    { titleKey: 'flowGuides.pos.step3.title', bodyKey: 'flowGuides.pos.step3.body' },
    { titleKey: 'flowGuides.pos.step4.title', bodyKey: 'flowGuides.pos.step4.body' },
  ] as const,
}

export const collectionsFlowGuide = {
  titleKey: 'flowGuides.collections.title',
  steps: [
    { titleKey: 'flowGuides.collections.step1.title', bodyKey: 'flowGuides.collections.step1.body' },
    { titleKey: 'flowGuides.collections.step2.title', bodyKey: 'flowGuides.collections.step2.body' },
    { titleKey: 'flowGuides.collections.step3.title', bodyKey: 'flowGuides.collections.step3.body' },
  ] as const,
}

export function resolveFlowGuideSteps(
  t: (key: string) => string,
  guide: { titleKey: string; steps: readonly { titleKey: string; bodyKey: string }[] },
): { title: string; steps: FlowGuideStep[] } {
  return {
    title: t(guide.titleKey),
    steps: guide.steps.map((s) => ({ title: t(s.titleKey), body: t(s.bodyKey) })),
  }
}
