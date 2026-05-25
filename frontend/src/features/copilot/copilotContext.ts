import type { CopilotUiContext } from '../../shared/types/copilot'
import type { Role } from '../../shared/types/roles'

interface RouteContextDescriptor {
  id: string
  label: string
  summary: string
  match: RegExp
  entityType?: string
  prompts: string[]
  actionLabels: string[]
  actionTypes: string[]
}

const ROUTE_CONTEXTS: RouteContextDescriptor[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    summary: 'Summarize KPI changes, explain anomalies, and recommend the next role-safe actions.',
    match: /^\/dashboard\/[^/]+$/,
    prompts: [
      'Summarize what changed in this dashboard and what needs attention first.',
      'Explain the biggest anomalies in the current KPI view.',
      'Recommend the next 3 actions for my role based on this dashboard.',
    ],
    actionLabels: ['Summarize dashboard', 'Explain anomalies', 'Recommend next actions'],
    actionTypes: [],
  },
  {
    id: 'invoice',
    label: 'Invoice workspace',
    summary: 'Draft invoices, review receivable risk, and stage customer billing actions with approval.',
    match: /^\/transactions\/invoice$/,
    prompts: [
      'Draft an invoice from my prompt and tell me what information is still missing.',
      'Review invoice risk and suggest the safest payment terms.',
      'Prepare an approval-gated invoice action for this customer request.',
    ],
    actionLabels: ['Draft invoice', 'Review receivable risk', 'Stage invoice for approval'],
    actionTypes: ['CREATE_INVOICE'],
  },
  {
    id: 'sales-order',
    label: 'Sales order workspace',
    summary: 'Draft sales orders, clarify margin implications, and suggest next steps without exceeding approval rules.',
    match: /^\/transactions\/sales-order$/,
    prompts: [
      'Draft a sales order from my prompt and highlight missing fields.',
      'Estimate margin impact for this sales request.',
      'Recommend the safest way to convert this request into an approved order.',
    ],
    actionLabels: ['Draft sales order', 'Estimate margin impact', 'Prepare approved order path'],
    actionTypes: [],
  },
  {
    id: 'purchase-order-form',
    label: 'Purchase order workspace',
    summary: 'Draft purchase orders, compare supplier options, and stage procurement approvals.',
    match: /^\/transactions\/purchase-order$/,
    prompts: [
      'Draft a purchase order from my prompt and show the approval preview.',
      'Recommend reorder quantities and supplier trade-offs.',
      'Prepare a procurement action with approval and warning details.',
    ],
    actionLabels: ['Draft purchase order', 'Compare suppliers', 'Stage procurement action'],
    actionTypes: ['CREATE_PURCHASE_ORDER'],
  },
  {
    id: 'pos',
    label: 'Point of sale',
    summary: 'Guide checkout, explain till or tender issues, and suggest safe next actions for the current register.',
    match: /^\/pos$/,
    prompts: [
      'Explain the current till or checkout risk on this register.',
      'Prepare a checkout draft from my prompt and tell me any missing details.',
      'Help me resolve a tender mismatch or blocked sale.',
    ],
    actionLabels: ['Explain till risk', 'Draft checkout', 'Resolve tender issue'],
    actionTypes: ['POS_CHECKOUT', 'POS_RECEIPT_REPRINT'],
  },
  {
    id: 'pos-history',
    label: 'Sale history',
    summary: 'Analyze recent sales, returns, and cashier activity in the current date range.',
    match: /^\/pos\/history$/,
    prompts: [
      'Summarize sales trends and exceptions in this period.',
      'Identify unusual refunds or tender patterns.',
      'Recommend follow-up actions for underperforming shifts.',
    ],
    actionLabels: ['Summarize sales trends', 'Flag unusual refunds', 'Recommend shift actions'],
    actionTypes: [],
  },
  {
    id: 'returns',
    label: 'Returns',
    summary: 'Review refund risk, explain return approvals, and stage return actions with warnings.',
    match: /^\/returns$/,
    prompts: [
      'Prepare a return approval request from my prompt.',
      'Explain refund risk and policy concerns for this return.',
      'Tell me what information is missing before a safe return can be staged.',
    ],
    actionLabels: ['Stage return', 'Explain refund risk', 'Check missing return details'],
    actionTypes: ['INITIATE_POS_RETURN', 'APPROVE_POS_RETURN'],
  },
  {
    id: 'till',
    label: 'Till management',
    summary: 'Review open till status, cash count variance, and closeout risk for the current register.',
    match: /^\/till$/,
    prompts: [
      'Summarize till status and any variance risk.',
      'Recommend the safest next till action.',
      'Explain what needs approval before closeout.',
    ],
    actionLabels: ['Summarize till status', 'Recommend till action', 'Explain closeout approval'],
    actionTypes: [],
  },
  {
    id: 'finance-customer-record',
    label: 'Customer finance record',
    summary: 'Review a specific customer account, payment risk, and invoice follow-up options.',
    match: /^\/finance\/customers\/([^/]+)$/,
    entityType: 'customer',
    prompts: [
      'Summarize this customer account and the main collection risks.',
      'Draft the next invoice or follow-up action for this customer.',
      'Recommend what to do before extending more credit here.',
    ],
    actionLabels: ['Summarize customer account', 'Draft customer invoice', 'Recommend credit action'],
    actionTypes: ['CREATE_INVOICE'],
  },
  {
    id: 'finance-supplier-record',
    label: 'Supplier finance record',
    summary: 'Review a specific supplier account, payable risk, and bill follow-up options.',
    match: /^\/finance\/suppliers\/([^/]+)$/,
    entityType: 'supplier',
    prompts: [
      'Summarize this supplier account and any payment urgency.',
      'Draft the next supplier bill or payable action from my prompt.',
      'Recommend what to do before confirming more supplier commitments.',
    ],
    actionLabels: ['Summarize supplier account', 'Draft supplier bill', 'Recommend payable action'],
    actionTypes: ['CREATE_SUPPLIER_BILL'],
  },
  {
    id: 'finance',
    label: 'Finance',
    summary: 'Analyze finance records, explain exposure, and stage finance-safe actions with approval.',
    match: /^\/finance\//,
    prompts: [
      'Summarize the main finance risks on this page.',
      'Prepare an approval-gated finance action from my prompt.',
      'Explain what changed in this finance area over the selected date range.',
    ],
    actionLabels: ['Summarize finance risk', 'Stage finance action', 'Explain recent changes'],
    actionTypes: ['CREATE_INVOICE', 'CREATE_SUPPLIER_BILL'],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    summary: 'Review stock risk, compare supplier actions, and stage purchase-order workflows.',
    match: /^\/procurement\/purchase-orders$/,
    prompts: [
      'Draft a purchase order from my prompt and show the approval preview.',
      'Recommend reorder priorities and supplier actions.',
      'Explain which procurement actions are reversible and which are warning-only.',
    ],
    actionLabels: ['Draft purchase order', 'Recommend reorder priorities', 'Explain warnings'],
    actionTypes: ['CREATE_PURCHASE_ORDER', 'SEND_PURCHASE_ORDER', 'CONFIRM_PURCHASE_ORDER', 'CREATE_GRN'],
  },
  {
    id: 'hr',
    label: 'HR',
    summary: 'Analyze workforce metrics, attendance, payroll exposure, and policy-safe next steps.',
    match: /^\/hr\//,
    prompts: [
      'Summarize the main workforce risks in this section.',
      'Explain payroll or attendance anomalies in the selected period.',
      'Recommend role-safe next actions for this HR page.',
    ],
    actionLabels: ['Summarize workforce risk', 'Explain payroll anomalies', 'Recommend HR next steps'],
    actionTypes: [],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    summary: 'Review campaign performance, promotion risk, and suggested spend changes.',
    match: /^\/marketing\//,
    prompts: [
      'Summarize campaign performance and weak ROI areas.',
      'Recommend how to reallocate spend in the selected period.',
      'Explain the biggest marketing risk on this page.',
    ],
    actionLabels: ['Summarize campaigns', 'Recommend spend changes', 'Explain marketing risk'],
    actionTypes: [],
  },
  {
    id: 'user-management',
    label: 'User and tenant management',
    summary: 'Help with users, roles, invitations, and permission-safe admin tasks.',
    match: /^\/admin\/users-tenants$/,
    prompts: [
      'Summarize pending admin tasks for user and tenant management.',
      'Recommend the safest role or access change for this request.',
      'Explain which permissions will be affected before I approve a change.',
    ],
    actionLabels: ['Summarize admin tasks', 'Recommend access change', 'Explain permission impact'],
    actionTypes: [],
  },
  {
    id: 'roles',
    label: 'Roles and permissions',
    summary: 'Design roles, explain permission impact, and prepare approval-safe access changes.',
    match: /^\/admin\/roles$|^\/settings\/roles$/,
    prompts: [
      'Design a role from my prompt and explain the permission impact.',
      'Suggest the safest role update for this request.',
      'Explain which access changes are reversible and which are not.',
    ],
    actionLabels: ['Design role', 'Suggest role update', 'Explain access impact'],
    actionTypes: [],
  },
  {
    id: 'settings',
    label: 'Settings',
    summary: 'Explain system configuration, connected services, and the status of AI capabilities.',
    match: /^\/settings$/,
    prompts: [
      'Explain the current AI copilot status and any setup gaps.',
      'Summarize the system configuration risks on this page.',
      'Recommend the next safe configuration steps for my role.',
    ],
    actionLabels: ['Explain AI status', 'Summarize config risk', 'Recommend next setup steps'],
    actionTypes: [],
  },
]

const DEFAULT_ROLE_PROMPTS: Record<Role, string[]> = {
  CEO: [
    'Give me the most important business risks I should act on today.',
    'What should I prioritize this week based on what I am viewing now?',
  ],
  CFO: [
    'Summarize cash, receivables, and payable risks on this page.',
    'Recommend the safest finance actions I can approve now.',
  ],
  ACCOUNTING: [
    'Tell me what must be cleared next for a clean accounting workflow.',
    'Explain the biggest reconciliation or close risk here.',
  ],
  SALES: [
    'Summarize the sales opportunity and risk on this page.',
    'Recommend the next best customer action for my role.',
  ],
  OPERATIONS: [
    'Highlight operational blockers or stock risks on this page.',
    'Recommend the next operational action with the least disruption.',
  ],
  HR: [
    'Summarize workforce risk and policy concerns here.',
    'Recommend the next HR action that fits my permissions.',
  ],
  MARKETING: [
    'Summarize campaign performance and the next best adjustment.',
    'Recommend where to shift effort or spend from this page.',
  ],
}

interface ResolveCopilotContextInput {
  pathname: string
  role: Role | null
  dateRange?: CopilotUiContext['dateRange']
  tillSession?: CopilotUiContext['tillSession']
}

export function resolveCopilotContext({
  pathname,
  role,
  dateRange,
  tillSession,
}: ResolveCopilotContextInput): CopilotUiContext {
  const descriptor = ROUTE_CONTEXTS.find((item) => item.match.test(pathname)) ?? {
    id: 'workspace',
    label: 'Workspace',
    summary: 'Answer questions, explain what you are seeing, and prepare only role-safe actions with approval.',
    match: /.*/,
    prompts: [
      'Summarize what is important on this page.',
      'Explain what I can safely do here with my permissions.',
      'Recommend the next best action for this workspace.',
    ],
    actionLabels: ['Summarize page', 'Explain permissions', 'Recommend next action'],
    actionTypes: [],
  }

  const entityMatch = pathname.match(descriptor.match)
  const entityId = descriptor.entityType && entityMatch?.[1] ? entityMatch[1] : undefined
  const rolePrompts = role ? DEFAULT_ROLE_PROMPTS[role] ?? [] : []

  return {
    path: pathname,
    sectionKey: descriptor.id,
    sectionLabel: descriptor.label,
    sectionSummary: descriptor.summary,
    entityType: descriptor.entityType,
    entityId,
    role,
    dateRange,
    tillSession,
    suggestedPrompts: [...descriptor.prompts, ...rolePrompts].slice(0, 6),
    suggestedActionLabels: descriptor.actionLabels,
    allowedActionTypes: descriptor.actionTypes,
  }
}
