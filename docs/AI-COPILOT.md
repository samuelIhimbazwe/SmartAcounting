# AI Copilot

## Overview
AI Copilot is the role-aware assistant built into SmartAccounting. It is available from anywhere inside the authenticated app and adapts to the page the user is currently working on, such as dashboards, invoices, POS, procurement, finance, HR, and user management.

The copilot helps users:
- understand what is happening on the current page
- ask questions about business data
- draft operational or finance actions
- recommend next steps based on role and context
- stage approved actions without exceeding permissions

## How It Works
AI Copilot always uses three boundaries:

1. Page context  
It knows which section the user is in and adjusts prompts, recommendations, and action types to that workflow.

2. Role and permission scope  
It can only help with actions the user is already allowed to perform manually.

3. Approval and accountability  
Any write action goes through preview and approval before execution. If an undo path exists, the copilot exposes it. If not, it shows a warning before the action is approved.

## What Users Can Do

### Dashboard and leadership
- summarize business risks
- explain KPI changes and anomalies
- recommend next actions for the current role

### Finance and accounting
- draft invoices and supplier bills
- explain receivable and payable exposure
- prepare finance actions for approval

### POS and retail operations
- assist with checkout drafts
- explain till, refund, or tender issues
- guide returns and approval-safe corrections

### Procurement
- draft purchase orders
- recommend reorder actions
- prepare procurement workflows for approval

### User and role management
- design roles from natural language
- explain permission impact
- prepare access changes for review

## User Experience
The floating AI Copilot follows the same pattern everywhere in the app:

1. The user opens the assistant from the floating launcher.
2. The user asks a question or describes a task in natural language.
3. The copilot responds with one of four outcomes:
   - answer
   - draft
   - approval request
   - undo option or warning
4. The user approves any write before it is executed.
5. The action appears in recent AI actions for traceability.

## Examples

### CEO
`What are the top risks in the business today?`

The copilot explains the main business issues from the current dashboard and recommends the next executive actions.

### Accountant
`Create an invoice for Kigali Traders, amount 250000 RWF, due 2026-06-10`

The copilot prepares the invoice, shows the preview, waits for approval, and then creates it.

### Cashier
`Sell 2 sodas and 1 bread, customer pays cash 5000`

The copilot drafts the checkout using the current POS context and asks for approval before completing it.

### Procurement officer
`Create a purchase order for low-stock sugar from ABC Supplies`

The copilot prepares the PO draft, shows cost and approval details, and warns if no automatic undo exists.

## Trust and Control
AI Copilot is designed to support users, not bypass them. It improves speed, guidance, and consistency, while keeping decisions visible, approved, and auditable.
