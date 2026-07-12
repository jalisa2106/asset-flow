# AssetFlow 📦

**Enterprise Asset & Resource Management System**

## 🌟 Overall Vision

The vision for AssetFlow is to simplify and digitize how organizations track, allocate, and maintain their physical assets and shared resources through a centralized ERP platform. It aims to reduce manual tracking inefficiencies by enabling structured asset lifecycles, centralized resource booking, and real-time visibility into asset condition and ownership.

## 🎯 Mission

To build a user-centric, responsive application that simplifies asset and resource management for any organization. The platform provides intuitive tools to:

- Set up departments, asset categories, and employee directories.
- Register and track assets through their full lifecycle.
- Allocate assets and handle booking conflicts.
- Run structured maintenance approval workflows and audit cycles.
- Get notified of overdue returns, bookings, and maintenance events.

## 🚀 Key Features

### 1. Authentication & Onboarding

- **Signup:** Creates an Employee account automatically (no self-assigned roles).
- **Admin Promotion:** Admins promote users to Department Heads or Asset Managers.

### 2. Operational Dashboard

- Real-time KPI cards (Assets Available, Allocated, Active Bookings).
- Highlights for overdue returns and upcoming maintenance.
- Quick actions for registering assets, booking resources, and raising maintenance requests.

### 3. Organization Master Setup

- **Departments:** Create, edit, assign heads, and build hierarchies.
- **Asset Categories:** Define categories with optional custom fields (e.g., warranty).
- **Employee Directory:** Centralized employee management and role assignment.

### 4. Asset Registration & Directory

- Register assets with auto-generated tags (e.g., AF-0001), serial numbers, and condition.
- Track lifecycle statuses: _Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed_.
- Comprehensive search via asset tag, serial number, or QR code.

### 5. Allocation & Transfer Management

- Allocate assets with conflict prevention (blocks double-allocation).
- Structured transfer requests and approval workflows.
- Check-in flows capturing return condition notes.

### 6. Resource Booking

- Time-slot booking for shared resources via Calendar view.
- Strict overlap validation to prevent double-booking.
- Automated reminders before booking slots begin.

### 7. Maintenance Workflows

- Submit maintenance requests with priority and photo attachments.
- Approval workflow before the asset is marked as _Under Maintenance_.
- Full maintenance history tracking per asset.

### 8. Structured Audit Cycles

- Create audit cycles for specific departments or date ranges.
- Assigned auditors verify assets as _Verified_, _Missing_, or _Damaged_.
- Auto-generated discrepancy reports for resolution.

### 9. Reports & Analytics

- Insights on asset utilization, maintenance frequency, and department allocations.
- Resource booking heatmaps and exportable operational reports.

### 10. Activity Logs & Notifications

- System-wide notifications for assignments, approvals, and overdue alerts.
- Complete audit logs detailing all administrative and employee actions.

## 👥 User Roles

- **Admin:** Manages master data (departments, categories, roles), audit cycles, and organization-wide analytics.
- **Asset Manager:** Registers assets, approves transfers/maintenance/returns, and resolves audit discrepancies.
- **Department Head:** Views departmental assets, approves internal transfers, and books shared resources for the department.
- **Employee:** Views personal allocations, books resources, raises maintenance requests, and initiates transfers.

## 🔄 Basic Workflow Overview

1. **Setup:** Admin sets up departments, categories, and assigns roles.
2. **Registration:** Asset Manager registers assets (Status: Available).
3. **Allocation:** Assets are allocated or marked as shared resources. Transfer requests handle conflicts.
4. **Booking:** Employees book shared resources; the system prevents overlapping time slots.
5. **Maintenance:** Damaged assets go through a requested/approved repair workflow.
6. **Auditing:** Periodic audit cycles verify asset presence and condition.
7. **Tracking:** All activities generate notifications, logs, and analytics.

## 🎨 Design Mockup

Explore the UI/UX conceptual design (POC) here:
[AssetFlow Excalidraw Mockup](https://app.excalidraw.com/l/65VNwvy7c4X/5ceOBMjbDby)

---

_Developed for Hackathon_
