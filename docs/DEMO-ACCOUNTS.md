# Demo accounts

Local / staging demo tenant for **Inyange Supermarket — Kimironko** (Rwanda retail).

| Field | Value |
|-------|-------|
| **Tenant ID** | `11111111-1111-4111-8111-111111111111` |
| **Password** (all users) | `password` |
| **API base** | `http://localhost:8080` |

## Users

| Username | Display name | RBAC role | User ID |
|----------|--------------|-----------|---------|
| `ceo` | Amina Uwase | Owner 👑 | `33333333-3333-4333-8333-333333333301` |
| `cfo` | Jean-Pierre Habimana | Finance Manager 💰 | `33333333-3333-4333-8333-333333333302` |
| `sales` | Grace Mukamana | Store Manager 🏪 | `33333333-3333-4333-8333-333333333303` |
| `ops` | Patrick Nzabonimpa | Stock Manager 📦 | `33333333-3333-4333-8333-333333333304` |
| `hr` | Diane Uwineza | HR Manager 👥 | `33333333-3333-4333-8333-333333333305` |
| `marketing` | Eric Ndayambaje | Marketing Lead 📢 | `33333333-3333-4333-8333-333333333306` |
| `accounting` | Solange Iradukunda | Accountant 📊 | `33333333-3333-4333-8333-333333333307` |

> **AuthRequest requires userId** — use the UUIDs in the table above.  
> The backend validates `@NotBlank` on `userId`.

## API login (PowerShell)

### CEO (Amina Uwase — Owner)

```powershell
$body = @{
  username = 'ceo'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333301'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

### CFO (Jean-Pierre Habimana — Finance Manager)

```powershell
$body = @{
  username = 'cfo'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333302'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

### Store Manager (Grace Mukamana)

```powershell
$body = @{
  username = 'sales'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333303'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

### Stock Manager (Patrick Nzabonimpa)

```powershell
$body = @{
  username = 'ops'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333304'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

### HR Manager (Diane Uwineza)

```powershell
$body = @{
  username = 'hr'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333305'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

### Marketing Lead (Eric Ndayambaje)

```powershell
$body = @{
  username = 'marketing'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333306'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

### Accountant (Solange Iradukunda)

```powershell
$body = @{
  username = 'accounting'
  password = 'password'
  tenantId = '11111111-1111-4111-8111-111111111111'
  userId   = '33333333-3333-4333-8333-333333333307'
} | ConvertTo-Json

$response = Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json -Depth 5
```

## Expected login response fields

- `token` — JWT access token
- `assignedRoles` — RBAC roles from `user_roles` / `roles` (e.g. Owner with 28 permissions)
- `permissions` — flattened permission codes for the assigned role(s)
- `role` — legacy role string (e.g. `CEO`) kept for backward compatibility
