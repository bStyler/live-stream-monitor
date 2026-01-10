# Admin System Testing Guide

## Overview

Phase 1 and Phase 2 of the admin system have been implemented and committed to the `feat/admin-system-phase-3` branch.

**Branch:** `feat/admin-system-phase-3`

## What's Been Implemented

### Phase 1: Foundation (Commit: 1b3556f)
- ✅ Database schema extended with admin fields
- ✅ Migration applied to production database
- ✅ Better Auth configured with role in session
- ✅ Admin middleware (`lib/admin-middleware.ts`)
- ✅ Admin dashboard page created

### Phase 2: Dashboard UI (Commit: 796d762)
- ✅ Admin layout with sidebar navigation
- ✅ Statistics dashboard with live data
- ✅ User list API endpoint with filters
- ✅ Users management page with search/filter
- ✅ shadcn/ui components (table, badge, input)

## Prerequisites

1. **Clean .next folder** (Dropbox was interfering during development):
   ```bash
   rm -rf .next
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Create an admin user** (if you don't have one yet):
   ```bash
   # First sign up at http://localhost:3000/sign-up
   # Then promote yourself to admin:
   npx tsx scripts/create-admin-user.ts your.email@example.com
   ```

## Testing Checklist

### 1. Admin Middleware Protection ✓

**Test non-admin access:**
1. Sign in as a regular user (or not signed in)
2. Navigate to `/admin`
3. **Expected:** Redirect to `/sign-in` (if not logged in) or `/dashboard` (if logged in as non-admin)

**Test admin access:**
1. Sign in as admin user
2. Navigate to `/admin`
3. **Expected:** See admin dashboard with statistics

### 2. Admin Dashboard (/admin) ✓

**Check statistics cards:**
- [ ] Total Users shows correct count
- [ ] Active Streams shows total monitored streams
- [ ] Avg Streams/User calculated correctly
- [ ] Database status shows "Healthy"

**Check quick actions:**
- [ ] "Manage Users" link goes to `/admin/users`
- [ ] "Send Invitations" link goes to `/admin/invitations` (not yet implemented)
- [ ] "View Activity" link goes to `/admin/users` (placeholder)
- [ ] "My Dashboard" link goes to `/dashboard`

### 3. Users Management Page (/admin/users) ✓

**Table display:**
- [ ] Users table loads successfully
- [ ] Displays columns: Name, Email, Role, Streams, Status, Last Login, Created
- [ ] Role badge shows correct color (admin=default, user=secondary)
- [ ] Status badge shows correct color (active=default, inactive=destructive)
- [ ] Stream quota shown as "X / Y" format

**Search functionality:**
- [ ] Search by name works
- [ ] Search by email works
- [ ] Search updates table in real-time
- [ ] Search resets pagination to page 1

**Filters:**
- [ ] Role filter shows "All Roles", "User", "Admin"
- [ ] Filtering by role works correctly
- [ ] Active status filter shows "All Status", "Active", "Inactive"
- [ ] Filtering by status works correctly
- [ ] Multiple filters work together

**Pagination:**
- [ ] Shows "Showing X of Y users" count
- [ ] Previous button disabled on page 1
- [ ] Next button disabled on last page
- [ ] Page navigation works correctly
- [ ] Page counter shows "Page X of Y"

### 4. API Endpoints ✓

**Test GET /api/admin/users:**

```bash
# Basic request
curl http://localhost:3000/api/admin/users

# With pagination
curl "http://localhost:3000/api/admin/users?page=1&limit=10"

# With search
curl "http://localhost:3000/api/admin/users?search=test"

# With filters
curl "http://localhost:3000/api/admin/users?role=admin&isActive=true"
```

**Expected response:**
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 5. Sidebar Navigation ✓

**Test all sidebar links:**
- [ ] Dashboard link goes to `/admin`
- [ ] Users link goes to `/admin/users`
- [ ] Invitations link goes to `/admin/invitations` (placeholder)
- [ ] Activity Log link goes to `/admin/activity` (placeholder)
- [ ] "Back to Dashboard" link goes to `/dashboard`

### 6. Responsive Design ✓

**Test different screen sizes:**
- [ ] Desktop view (sidebar visible, full width)
- [ ] Tablet view (check if sidebar remains functional)
- [ ] Mobile view (check if table is scrollable)

### 7. Database Verification ✓

**Verify migration applied:**
```bash
npx tsx -e "
import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
config({ path: '.env.local' });

async function checkSchema() {
  // Check user table columns
  const result = await sql.query(\`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'user'
    AND column_name IN ('role', 'stream_quota', 'is_active', 'last_login_at')
  \`);

  console.log('User table admin columns:');
  result.rows.forEach(r => console.log(\`  - \${r.column_name}: \${r.data_type}\`));

  // Check new tables exist
  const tables = await sql.query(\`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('invitations', 'impersonation_logs')
  \`);

  console.log('\\nNew admin tables:');
  tables.rows.forEach(r => console.log(\`  - \${r.table_name}\`));

  process.exit(0);
}

checkSchema().catch(console.error);
"
```

**Expected output:**
```
User table admin columns:
  - role: text
  - stream_quota: integer
  - is_active: boolean
  - last_login_at: timestamp with time zone

New admin tables:
  - impersonation_logs
  - invitations
```

## Known Issues

### Dropbox Sync Interference
- **Issue:** Dropbox syncing the `.next` folder causes "EPERM: operation not permitted" errors
- **Solution:** Clear `.next` folder before testing: `rm -rf .next && npm run dev`
- **Long-term:** Consider excluding `.next` from Dropbox sync

### Better Auth Session Type
- **Status:** Better Auth has been configured with `additionalFields` for role, streamQuota, isActive, lastLoginAt
- **Note:** TypeScript types may not show these fields initially. Type assertions may be needed until Better Auth regenerates types.

## Next Steps (Phase 3)

The following features are planned but not yet implemented:

- [ ] User detail/edit page (`/admin/users/[id]`)
- [ ] User creation/invitation system
- [ ] User role/quota editing
- [ ] User impersonation
- [ ] Activity logging
- [ ] Admin action audit trail

## Troubleshooting

### Can't access /admin (redirects to dashboard)
- Check that you promoted your user to admin role
- Verify: `npx tsx scripts/create-admin-user.ts your.email@example.com`

### Server won't start (500 errors)
- Clear `.next` folder: `rm -rf .next`
- Pause Dropbox sync temporarily
- Restart dev server: `npm run dev`

### Users table shows "No users found"
- Verify database connection in `.env.local`
- Check if migration was applied successfully
- Verify users exist in database

### TypeScript errors about session.user.role
- Better Auth types may need regeneration
- Use type assertion: `session.user as User & { role: string }`
- Or restart TypeScript server in IDE

## Success Criteria

All features should work as specified above. The admin system should:
- ✅ Protect admin routes from non-admin users
- ✅ Display accurate user statistics
- ✅ Allow searching and filtering users
- ✅ Show correct stream quota usage
- ✅ Handle pagination correctly
- ✅ Provide a clean, professional admin interface

## Questions or Issues?

If you encounter any issues during testing, please note:
- What page/feature
- What you expected vs what happened
- Any console errors
- Browser/environment details

We can then address them in the next development session.
