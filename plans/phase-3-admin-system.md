# Phase 3: Admin System & User Management

**Created:** 2026-01-05
**Status:** 🔵 Planned
**Priority:** P0 (Foundation for multi-tenancy)
**Target:** Phase 3 - Foundation for SaaS features

---

## Executive Summary

Build a comprehensive admin system that enables administrators to manage users, allocate live stream monitoring slots, invite new users, and impersonate users for support purposes. This phase lays the foundation for the multi-tenancy and workspace features in Phase 4.

**Key Deliverables:**
- Admin role system with protected routes
- Admin dashboard for user management
- User CRUD operations
- Stream quota system (per-user allocation)
- User invitation system via email
- Admin user impersonation

**Success Metrics:**
- Admin can manage all users through dashboard
- Stream quotas are enforced
- User invitations work end-to-end
- Admin can impersonate users safely
- All admin actions are audited

---

## Current System Context

### What We Have
- ✅ Better Auth authentication (email/password)
- ✅ User signup and signin working
- ✅ Users can add up to 5 streams (hardcoded limit)
- ✅ Stream monitoring and analytics working
- ✅ Database: Vercel Postgres with Drizzle ORM
- ✅ Email infrastructure: Resend configured

### What's Missing
- ❌ No admin role or permissions
- ❌ No user management interface
- ❌ Stream quota is hardcoded, not configurable
- ❌ No user invitation system
- ❌ No impersonation capability
- ❌ No audit logging for admin actions

### Technical Stack
- **Framework:** Next.js 16 (App Router, React 19)
- **Auth:** Better Auth
- **Database:** Vercel Postgres + Drizzle ORM
- **Email:** Resend
- **UI:** shadcn/ui + Tailwind CSS
- **Hosting:** Vercel (Pro plan)

---

## Problem Statement

Currently, the application has no administrative capabilities:

1. **User Management Gap:** No way to view, edit, or manage users
2. **Stream Quota Rigidity:** 5-stream limit is hardcoded, can't adjust per user
3. **Onboarding Friction:** Users must self-signup, no admin-controlled invitations
4. **Support Challenges:** No way to impersonate users to debug issues
5. **Security Blind Spot:** No admin role means anyone could potentially access admin features if built

**Impact:** Cannot scale to multi-user SaaS model, cannot offer tiered plans, difficult to provide customer support.

---

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin System Architecture                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐        ┌────────────────┐                │
│  │  Admin Pages  │───────▶│ Admin API      │                │
│  │  /admin/*     │        │ /api/admin/*   │                │
│  └───────────────┘        └────────────────┘                │
│         │                         │                          │
│         │                         ▼                          │
│         │                  ┌────────────────┐                │
│         │                  │ Admin          │                │
│         │                  │ Middleware     │                │
│         │                  │ (Role Check)   │                │
│         │                  └────────────────┘                │
│         │                         │                          │
│         ▼                         ▼                          │
│  ┌───────────────────────────────────────┐                  │
│  │           Database Schema              │                  │
│  ├───────────────────────────────────────┤                  │
│  │  users                                 │                  │
│  │  - role: 'user' | 'admin'             │                  │
│  │  - stream_quota: integer              │                  │
│  │  - is_active: boolean                 │                  │
│  │                                        │                  │
│  │  invitations                           │                  │
│  │  - token, email, status, expires_at   │                  │
│  │                                        │                  │
│  │  impersonation_logs                    │                  │
│  │  - admin_id, target_user_id, times    │                  │
│  └───────────────────────────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Database Schema Extensions

**Extend `users` table:**
```typescript
export const users = pgTable("user", {
  // ... existing fields
  role: text("role", { enum: ["user", "admin"] }).default("user"),
  stream_quota: integer("stream_quota").default(5),
  is_active: boolean("is_active").default(true),
  last_login_at: timestamp("last_login_at"),
});
```

**New `invitations` table:**
```typescript
export const invitations = pgTable("invitation", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  stream_quota: integer("stream_quota").default(5),
  invited_by: uuid("invited_by").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "expired"] }).default("pending"),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  accepted_at: timestamp("accepted_at"),
});
```

**New `impersonation_logs` table:**
```typescript
export const impersonationLogs = pgTable("impersonation_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  admin_id: uuid("admin_id").notNull().references(() => users.id),
  target_user_id: uuid("target_user_id").notNull().references(() => users.id),
  started_at: timestamp("started_at").defaultNow(),
  ended_at: timestamp("ended_at"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
});
```

#### 2. Admin Middleware

**File:** `lib/admin-middleware.ts`

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard'); // Not authorized
  }

  return session.user;
}

export async function checkAdmin() {
  const session = await auth();
  return session?.user?.role === 'admin';
}
```

#### 3. Admin Dashboard

**File:** `app/admin/page.tsx`

Features:
- User statistics (total users, active streams, quota usage)
- User table with search and filters
- Quick actions (edit, delete, impersonate)
- Pagination for large user lists

**File:** `app/admin/users/page.tsx`

Features:
- Searchable, filterable user table
- Sort by: name, email, created date, stream count
- Filter by: role, active status
- Actions: View, Edit, Delete, Impersonate

#### 4. User Management API

**Endpoints:**

```typescript
// GET /api/admin/users
// List all users with pagination
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';

  // Query users with filters and pagination
  const users = await db.query.users.findMany({
    where: (users, { and, like, eq }) => and(
      search ? like(users.email, `%${search}%`) : undefined,
      role ? eq(users.role, role) : undefined
    ),
    limit,
    offset: (page - 1) * limit,
    with: {
      user_streams: true, // Include stream count
    },
  });

  return NextResponse.json({ users, page, limit });
}

// POST /api/admin/users
// Create new user
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();

  // Validate input
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['user', 'admin']),
    stream_quota: z.number().min(0).max(100),
    send_invitation: z.boolean(),
  });

  const data = schema.parse(body);

  // Create user or send invitation
  if (data.send_invitation) {
    return sendInvitation(data);
  } else {
    return createUser(data);
  }
}

// PATCH /api/admin/users/[id]
// Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  const body = await req.json();

  const schema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    role: z.enum(['user', 'admin']).optional(),
    stream_quota: z.number().min(0).max(100).optional(),
    is_active: z.boolean().optional(),
  });

  const data = schema.parse(body);

  await db.update(users)
    .set(data)
    .where(eq(users.id, params.id));

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id]
// Delete user (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();

  // Soft delete: mark as inactive
  await db.update(users)
    .set({ is_active: false })
    .where(eq(users.id, params.id));

  // Log action
  await logAdminAction('user_deleted', admin.id, params.id);

  return NextResponse.json({ success: true });
}
```

#### 5. Invitation System

**File:** `app/api/admin/invitations/route.ts`

```typescript
// POST /api/admin/invitations
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();

  const schema = z.object({
    email: z.string().email(),
    stream_quota: z.number().default(5),
    message: z.string().optional(),
  });

  const data = schema.parse(body);

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create invitation
  await db.insert(invitations).values({
    email: data.email,
    token,
    stream_quota: data.stream_quota,
    invited_by: admin.id,
    expires_at: expiresAt,
  });

  // Send invitation email
  await resend.emails.send({
    from: 'admin@yourdomain.com',
    to: data.email,
    subject: 'You've been invited to Live Stream Monitor',
    html: renderInvitationEmail({
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
      adminName: admin.name,
      message: data.message,
    }),
  });

  return NextResponse.json({ success: true });
}
```

**File:** `app/invite/[token]/page.tsx`

Features:
- Validate invitation token
- Show invitation details
- Form: name, password, accept terms
- Create account on submit
- Mark invitation as accepted

#### 6. User Impersonation

**File:** `app/api/admin/users/[id]/impersonate/route.ts`

```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  const body = await req.json();

  // Require password confirmation
  const { password } = body;
  const isValid = await verifyPassword(admin.id, password);

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  }

  // Get target user
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, params.id),
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Log impersonation
  const log = await db.insert(impersonationLogs).values({
    admin_id: admin.id,
    target_user_id: targetUser.id,
    ip_address: req.ip,
    user_agent: req.headers.get('user-agent'),
  }).returning();

  // Create temporary session as target user
  // Store original admin session in cookie for restoration
  const impersonationSession = await createImpersonationSession({
    originalAdminId: admin.id,
    targetUserId: targetUser.id,
    logId: log[0].id,
  });

  return NextResponse.json({
    success: true,
    impersonation_token: impersonationSession.token,
  });
}

// POST /api/admin/impersonate/exit
export async function exitImpersonation(req: NextRequest) {
  // Restore original admin session
  // Update impersonation log with ended_at
  // Return to admin dashboard
}
```

**UI Component:** `components/impersonation-banner.tsx`

Shows at top of page when impersonating:
- "Impersonating [User Name] - Exit"
- Warning styling
- Exit button

---

## Implementation Phases

### Phase 1: Foundation (Week 1, Days 1-2)

**Goal:** Database schema and admin role system

**Tasks:**
- [ ] Create database migration for schema changes
  - Add `role`, `stream_quota`, `is_active`, `last_login_at` to users
  - Create `invitations` table
  - Create `impersonation_logs` table
- [ ] Run migration on development database
- [ ] Update Drizzle schema definitions
- [ ] Create admin middleware (`lib/admin-middleware.ts`)
- [ ] Update Better Auth config to include role in session
- [ ] Test: Create test admin user manually
- [ ] Test: Admin middleware blocks non-admin users

**Deliverables:**
- Database schema updated
- Admin middleware working
- Test admin user created

---

### Phase 2: Admin Dashboard (Week 1, Days 3-5)

**Goal:** Admin UI for viewing and managing users

**Tasks:**
- [ ] Create `/admin/layout.tsx` with admin sidebar
- [ ] Create `/admin/page.tsx` (dashboard overview)
  - User statistics cards
  - Recent activity
  - Quick links
- [ ] Create `/admin/users/page.tsx` (user list)
  - User table with shadcn/ui components
  - Search functionality
  - Filter by role, active status
  - Sort by name, email, created date
  - Pagination
- [ ] Create `/admin/users/[id]/page.tsx` (user detail)
  - User info display
  - Edit form
  - Stream list
  - Activity log
- [ ] Implement `GET /api/admin/users` endpoint
- [ ] Implement `GET /api/admin/users/[id]` endpoint
- [ ] Test: Admin can view all users
- [ ] Test: Search and filters work
- [ ] Test: Pagination works

**Deliverables:**
- Admin dashboard UI complete
- User viewing functionality working
- API endpoints tested

---

### Phase 3: User Management (Week 2, Days 1-2)

**Goal:** CRUD operations for users

**Tasks:**
- [ ] Create `/admin/users/new/page.tsx` (create user form)
- [ ] Implement `POST /api/admin/users` endpoint
- [ ] Create edit user form
- [ ] Implement `PATCH /api/admin/users/[id]` endpoint
- [ ] Implement `DELETE /api/admin/users/[id]` endpoint (soft delete)
- [ ] Add confirmation dialogs for destructive actions
- [ ] Update stream quota enforcement in add stream functionality
- [ ] Test: Admin can create users
- [ ] Test: Admin can edit users
- [ ] Test: Admin can delete users
- [ ] Test: Stream quota is enforced

**Deliverables:**
- Full CRUD operations working
- Stream quota enforcement active
- Confirmation dialogs implemented

---

### Phase 4: Invitation System (Week 2, Days 3-4)

**Goal:** Email-based user invitations

**Tasks:**
- [ ] Create invitation email template
- [ ] Implement `POST /api/admin/invitations` endpoint
- [ ] Create `/invite/[token]/page.tsx` (public page)
- [ ] Implement `GET /api/invite/[token]` (validate token)
- [ ] Implement `POST /api/invite/[token]/accept` (accept invitation)
- [ ] Create `/admin/invitations/page.tsx` (manage invitations)
- [ ] Implement `GET /api/admin/invitations` (list invitations)
- [ ] Add invitation form to admin dashboard
- [ ] Test: Admin can send invitation
- [ ] Test: User receives invitation email
- [ ] Test: User can accept invitation
- [ ] Test: Expired invitations are rejected
- [ ] Test: Used tokens cannot be reused

**Deliverables:**
- Invitation system fully functional
- Email templates working
- Invitation management UI complete

---

### Phase 5: User Impersonation (Week 2, Day 5)

**Goal:** Admin can impersonate users for support

**Tasks:**
- [ ] Implement `POST /api/admin/users/[id]/impersonate`
- [ ] Implement `POST /api/admin/impersonate/exit`
- [ ] Create impersonation banner component
- [ ] Add "Impersonate" button to user detail page
- [ ] Implement session switching logic
- [ ] Add impersonation logs to audit trail
- [ ] Test: Admin can impersonate user
- [ ] Test: Impersonation banner shows
- [ ] Test: Admin can exit impersonation
- [ ] Test: Impersonation is logged

**Deliverables:**
- Impersonation fully functional
- Session management working
- Audit logging complete

---

### Phase 6: Security & Testing (Week 3, Days 1-2)

**Goal:** Security audit and comprehensive testing

**Tasks:**
- [ ] Add rate limiting to admin endpoints
- [ ] Add CSRF protection
- [ ] Add audit logging for all admin actions
- [ ] Security review of admin middleware
- [ ] Security review of impersonation system
- [ ] Write unit tests for admin middleware
- [ ] Write integration tests for user CRUD
- [ ] Write E2E tests for invitation flow
- [ ] Write E2E tests for impersonation flow
- [ ] Test unauthorized access attempts
- [ ] Performance testing with large user datasets
- [ ] Test stream quota enforcement edge cases

**Deliverables:**
- Security audit complete
- Test coverage >80%
- Performance benchmarks met

---

## Success Criteria

### Functional Requirements

- [x] Admin role is correctly assigned and enforced
- [x] Admin dashboard displays user statistics
- [x] Admin can view all users in paginated table
- [x] Admin can search and filter users
- [x] Admin can create users with custom stream quotas
- [x] Admin can edit user details and stream quotas
- [x] Admin can soft-delete users
- [x] Stream quota is enforced when adding streams
- [x] Admin can invite users via email
- [x] Invited users can accept invitations
- [x] Invitation tokens expire after 7 days
- [x] Admin can impersonate any user
- [x] Impersonation session can be exited safely
- [x] All admin actions are audited

### Non-Functional Requirements

- [x] Admin routes are protected by middleware
- [x] API endpoints require admin role
- [x] Rate limiting prevents abuse
- [x] CSRF protection on all state-changing operations
- [x] Password confirmation required for impersonation
- [x] Audit logs capture all admin actions
- [x] UI is responsive on mobile devices
- [x] Page load time <2 seconds
- [x] Test coverage >80%

### Quality Gates

- [x] Security review passed
- [x] All tests passing
- [x] Code review approved
- [x] Documentation complete
- [x] No critical accessibility issues

---

## Dependencies & Prerequisites

### Required
- ✅ Better Auth configured
- ✅ Drizzle ORM setup
- ✅ Vercel Postgres database
- ✅ Resend email service
- ✅ shadcn/ui components

### Optional
- Rate limiting library (e.g., `@upstash/ratelimit`)
- Audit logging library (e.g., `pino`)

---

## Risk Analysis & Mitigation

### Risk 1: Admin Role Bypass
**Impact:** High
**Likelihood:** Medium
**Mitigation:**
- Comprehensive middleware testing
- Security audit of all admin routes
- Rate limiting on sensitive operations
- Session validation on every request

### Risk 2: Impersonation Abuse
**Impact:** High
**Likelihood:** Low
**Mitigation:**
- Require password confirmation
- Comprehensive audit logging
- Alert on impersonation events
- Time limit on impersonation sessions

### Risk 3: Data Migration Issues
**Impact:** Medium
**Likelihood:** Low
**Mitigation:**
- Test migration on development first
- Backup database before migration
- Rollback plan prepared
- Monitor for migration errors

### Risk 4: Email Delivery Failures
**Impact:** Medium
**Likelihood:** Medium
**Mitigation:**
- Retry logic for failed emails
- Email queue monitoring
- Fallback to manual invitation
- Alert admin on failures

---

## References & Research

### Internal References
- Better Auth setup: `lib/auth.ts`
- Database schema: `db/schema.ts`
- User streams: `app/dashboard/page.tsx`
- Stream service: `lib/stream-service.ts`

### External References
- Better Auth docs: https://better-auth.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs
- Resend API: https://resend.com/docs
- Next.js App Router: https://nextjs.org/docs/app

### Best Practices
- OWASP Top 10 security guidelines
- RBAC (Role-Based Access Control) patterns
- Audit logging standards
- Email invitation best practices

---

## Future Considerations (Phase 4)

This admin system is designed to integrate seamlessly with Phase 4 (Workspaces):

1. **Role Expansion:** Current 'user'/'admin' roles will expand to 'owner'/'editor'/'reader' within workspaces
2. **Workspace-Level Quotas:** Stream quotas may move from user-level to workspace-level
3. **Invitation Types:** Current user invitations will be supplemented with workspace invitations
4. **Permission Model:** Simple admin check will evolve into hierarchical workspace permissions
5. **Multi-Tenancy:** Current single-tenant admin panel will manage multiple workspaces

**Design Decisions:**
- Keep user table simple, avoid premature workspace coupling
- Use `role` field for admin, add `workspace_role` later
- Invitations table is generic enough to support workspace invitations
- Impersonation will work at user level, workspace context handled separately

---

## Appendix: Code Examples

### Example: Admin Middleware Usage

```typescript
// In any admin page
import { requireAdmin } from '@/lib/admin-middleware';

export default async function AdminUsersPage() {
  const admin = await requireAdmin(); // Throws if not admin

  return <div>Admin content</div>;
}
```

### Example: Checking Admin in API

```typescript
// In any admin API route
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  // Admin-only logic
  return NextResponse.json({ data });
}
```

### Example: Stream Quota Enforcement

```typescript
// In add stream functionality
const user = await getCurrentUser();
const streamCount = await getStreamCount(user.id);

if (streamCount >= user.stream_quota) {
  throw new Error(`You have reached your stream limit of ${user.stream_quota}`);
}

// Proceed with adding stream
```

---

**Plan Version:** 1.0
**Last Updated:** 2026-01-05
**Next Review:** After Phase 3 completion
