#!/bin/bash

# supabase structure
mkdir -p supabase/migrations
touch supabase/config.toml
touch supabase/seed.sql
touch supabase/migrations/0001_departments.sql
touch supabase/migrations/0002_asset_categories.sql
touch supabase/migrations/0003_employee_profiles.sql
touch supabase/migrations/0004_assets.sql
touch supabase/migrations/0005_allocations_transfers.sql
touch supabase/migrations/0006_resource_bookings.sql
touch supabase/migrations/0007_maintenance_requests.sql
touch supabase/migrations/0008_audit_cycles.sql
touch supabase/migrations/0009_notifications_activity_log.sql
touch supabase/migrations/0010_rls_policies.sql

# middleware
touch middleware.ts
echo "import { NextResponse } from 'next/server'; export function middleware() { return NextResponse.next(); }" > middleware.ts

# auth
mkdir -p src/app/\(auth\)/login
mkdir -p src/app/\(auth\)/signup
mkdir -p src/app/\(auth\)/forgot-password
echo "export default function Page() { return <h1>Login TODO</h1>; }" > src/app/\(auth\)/login/page.tsx
echo "export default function Page() { return <h1>Signup TODO</h1>; }" > src/app/\(auth\)/signup/page.tsx
echo "export default function Page() { return <h1>Forgot Password TODO</h1>; }" > src/app/\(auth\)/forgot-password/page.tsx

# dashboard layout
mkdir -p src/app/\(dashboard\)/dashboard
mkdir -p src/app/\(dashboard\)/organization/departments
mkdir -p src/app/\(dashboard\)/organization/categories
mkdir -p src/app/\(dashboard\)/organization/employees
mkdir -p src/app/\(dashboard\)/assets/new
mkdir -p src/app/\(dashboard\)/assets/\[assetId\]/history
mkdir -p src/app/\(dashboard\)/allocations/new
mkdir -p src/app/\(dashboard\)/allocations/transfers
mkdir -p src/app/\(dashboard\)/bookings/new
mkdir -p src/app/\(dashboard\)/maintenance/new
mkdir -p src/app/\(dashboard\)/audits/new
mkdir -p src/app/\(dashboard\)/audits/\[auditId\]
mkdir -p src/app/\(dashboard\)/reports
mkdir -p src/app/\(dashboard\)/notifications

echo "export default function Layout({ children }: { children: React.ReactNode }) { return <div>{children}</div>; }" > src/app/\(dashboard\)/layout.tsx
echo "export default function Page() { return <h1>Dashboard TODO</h1>; }" > src/app/\(dashboard\)/dashboard/page.tsx
echo "export default function Page() { return <h1>Organization TODO</h1>; }" > src/app/\(dashboard\)/organization/page.tsx
echo "export default function Page() { return <h1>Departments TODO</h1>; }" > src/app/\(dashboard\)/organization/departments/page.tsx
echo "export default function Page() { return <h1>Categories TODO</h1>; }" > src/app/\(dashboard\)/organization/categories/page.tsx
echo "export default function Page() { return <h1>Employees TODO</h1>; }" > src/app/\(dashboard\)/organization/employees/page.tsx
echo "export default function Page() { return <h1>Assets TODO</h1>; }" > src/app/\(dashboard\)/assets/page.tsx
echo "export default function Page() { return <h1>New Asset TODO</h1>; }" > src/app/\(dashboard\)/assets/new/page.tsx
echo "export default function Page() { return <h1>Asset Detail TODO</h1>; }" > src/app/\(dashboard\)/assets/\[assetId\]/page.tsx
echo "export default function Page() { return <h1>Asset History TODO</h1>; }" > src/app/\(dashboard\)/assets/\[assetId\]/history/page.tsx
echo "export default function Page() { return <h1>Allocations TODO</h1>; }" > src/app/\(dashboard\)/allocations/page.tsx
echo "export default function Page() { return <h1>New Allocation TODO</h1>; }" > src/app/\(dashboard\)/allocations/new/page.tsx
echo "export default function Page() { return <h1>Transfers TODO</h1>; }" > src/app/\(dashboard\)/allocations/transfers/page.tsx
echo "export default function Page() { return <h1>Bookings TODO</h1>; }" > src/app/\(dashboard\)/bookings/page.tsx
echo "export default function Page() { return <h1>New Booking TODO</h1>; }" > src/app/\(dashboard\)/bookings/new/page.tsx
echo "export default function Page() { return <h1>Maintenance TODO</h1>; }" > src/app/\(dashboard\)/maintenance/page.tsx
echo "export default function Page() { return <h1>New Maintenance TODO</h1>; }" > src/app/\(dashboard\)/maintenance/new/page.tsx
echo "export default function Page() { return <h1>Audits TODO</h1>; }" > src/app/\(dashboard\)/audits/page.tsx
echo "export default function Page() { return <h1>New Audit TODO</h1>; }" > src/app/\(dashboard\)/audits/new/page.tsx
echo "export default function Page() { return <h1>Audit Verification TODO</h1>; }" > src/app/\(dashboard\)/audits/\[auditId\]/page.tsx
echo "export default function Page() { return <h1>Reports TODO</h1>; }" > src/app/\(dashboard\)/reports/page.tsx
echo "export default function Page() { return <h1>Notifications TODO</h1>; }" > src/app/\(dashboard\)/notifications/page.tsx

# api routes
API_RES="import { NextResponse } from 'next/server'; export async function GET() { return NextResponse.json({ status: 'not implemented' }); } export async function POST() { return NextResponse.json({ status: 'not implemented' }); }"
API_PATCH="import { NextResponse } from 'next/server'; export async function GET() { return NextResponse.json({ status: 'not implemented' }); } export async function PATCH() { return NextResponse.json({ status: 'not implemented' }); }"

mkdir -p src/app/api/assets/\[assetId\]/status
mkdir -p src/app/api/allocations/\[id\]/return
mkdir -p src/app/api/allocations/transfers/\[id\]/approve
mkdir -p src/app/api/bookings/\[id\]/cancel
mkdir -p src/app/api/bookings/\[id\]/reschedule
mkdir -p src/app/api/maintenance/\[id\]/approve
mkdir -p src/app/api/maintenance/\[id\]/assign
mkdir -p src/app/api/maintenance/\[id\]/resolve
mkdir -p src/app/api/audits/\[id\]/verify
mkdir -p src/app/api/audits/\[id\]/close
mkdir -p src/app/api/departments
mkdir -p src/app/api/categories
mkdir -p src/app/api/employees/\[id\]/promote
mkdir -p src/app/api/notifications
mkdir -p src/app/api/reports/utilization
mkdir -p src/app/api/reports/maintenance-frequency
mkdir -p src/app/api/reports/booking-heatmap

echo "$API_RES" > src/app/api/assets/route.ts
echo "$API_PATCH" > src/app/api/assets/\[assetId\]/route.ts
echo "$API_PATCH" > src/app/api/assets/\[assetId\]/status/route.ts

echo "$API_RES" > src/app/api/allocations/route.ts
echo "$API_PATCH" > src/app/api/allocations/\[id\]/return/route.ts
echo "$API_RES" > src/app/api/allocations/transfers/route.ts
echo "$API_PATCH" > src/app/api/allocations/transfers/\[id\]/approve/route.ts

echo "$API_RES" > src/app/api/bookings/route.ts
echo "$API_PATCH" > src/app/api/bookings/\[id\]/cancel/route.ts
echo "$API_PATCH" > src/app/api/bookings/\[id\]/reschedule/route.ts

echo "$API_RES" > src/app/api/maintenance/route.ts
echo "$API_PATCH" > src/app/api/maintenance/\[id\]/approve/route.ts
echo "$API_PATCH" > src/app/api/maintenance/\[id\]/assign/route.ts
echo "$API_PATCH" > src/app/api/maintenance/\[id\]/resolve/route.ts

echo "$API_RES" > src/app/api/audits/route.ts
echo "$API_PATCH" > src/app/api/audits/\[id\]/verify/route.ts
echo "$API_PATCH" > src/app/api/audits/\[id\]/close/route.ts

echo "$API_RES" > src/app/api/departments/route.ts
echo "$API_RES" > src/app/api/categories/route.ts
echo "$API_RES" > src/app/api/employees/route.ts
echo "$API_PATCH" > src/app/api/employees/\[id\]/promote/route.ts
echo "$API_RES" > src/app/api/notifications/route.ts

echo "$API_RES" > src/app/api/reports/utilization/route.ts
echo "$API_RES" > src/app/api/reports/maintenance-frequency/route.ts
echo "$API_RES" > src/app/api/reports/booking-heatmap/route.ts

# components
mkdir -p src/components/ui
mkdir -p src/components/layout
mkdir -p src/components/dashboard
mkdir -p src/components/assets
mkdir -p src/components/allocations
mkdir -p src/components/bookings
mkdir -p src/components/maintenance
mkdir -p src/components/audits
mkdir -p src/components/organization
mkdir -p src/components/notifications

touch src/components/layout/Sidebar.tsx
touch src/components/layout/Topbar.tsx
touch src/components/layout/RoleGate.tsx

touch src/components/dashboard/KpiCard.tsx
touch src/components/dashboard/OverdueList.tsx

touch src/components/assets/AssetForm.tsx
touch src/components/assets/AssetTable.tsx
touch src/components/assets/AssetStatusBadge.tsx
touch src/components/assets/AssetHistoryTimeline.tsx

touch src/components/allocations/AllocationForm.tsx
touch src/components/allocations/ConflictDialog.tsx
touch src/components/allocations/TransferRequestCard.tsx

touch src/components/bookings/BookingCalendar.tsx
touch src/components/bookings/BookingForm.tsx

touch src/components/maintenance/MaintenanceForm.tsx
touch src/components/maintenance/MaintenanceWorkflowBoard.tsx

touch src/components/audits/AuditCycleForm.tsx
touch src/components/audits/AuditorVerificationGrid.tsx
touch src/components/audits/DiscrepancyReport.tsx

touch src/components/organization/DepartmentForm.tsx
touch src/components/organization/CategoryForm.tsx
touch src/components/organization/EmployeeDirectoryTable.tsx

touch src/components/notifications/NotificationItem.tsx

# lib
mkdir -p src/lib/supabase
mkdir -p src/lib/validators

touch src/lib/supabase/client.ts
touch src/lib/supabase/server.ts
touch src/lib/supabase/admin.ts

touch src/lib/validators/asset.schema.ts
touch src/lib/validators/allocation.schema.ts
touch src/lib/validators/booking.schema.ts
touch src/lib/validators/maintenance.schema.ts
touch src/lib/validators/audit.schema.ts

touch src/lib/permissions.ts
touch src/lib/constants.ts
# utils.ts is already created by shadcn

# hooks
mkdir -p src/hooks
touch src/hooks/useUser.ts
touch src/hooks/useRole.ts
touch src/hooks/useNotifications.ts

# types
mkdir -p src/types
touch src/types/database.types.ts
touch src/types/asset.ts
touch src/types/allocation.ts
touch src/types/booking.ts
touch src/types/maintenance.ts
touch src/types/audit.ts
touch src/types/index.ts

# store
mkdir -p src/store
touch src/store/uiStore.ts

# public
mkdir -p public/icons
touch public/icons/.gitkeep

# create empty .gitkeep for empty dirs
find . -type d -empty -exec touch {}/.gitkeep \;
