# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Stream Monitor is a Next.js 16 application built with React 19, TypeScript, and Tailwind CSS. It uses the App Router architecture and shadcn/ui component system with the Radix Maia style variant.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint (uses ESLint v9 flat config)

### Port Management
Use `kill-port` command if dev server port conflicts occur.

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **React**: Version 19.2.1 (React Server Components enabled)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI Components**: shadcn/ui with Radix Maia style, Lucide icons
- **Utilities**: clsx + tailwind-merge (via `cn()` helper)

### Project Structure
```
app/              # Next.js App Router
├── layout.tsx    # Root layout with font configuration (Geist + Inter)
├── page.tsx      # Home page
└── globals.css   # Global styles and Tailwind

components/
├── ui/           # shadcn/ui components
└── *.tsx         # Custom components

lib/
└── utils.ts      # Utility functions (cn() for className merging)
```

### Path Aliases
The project uses `@/*` alias mapping to the root directory:
- `@/components` → components directory
- `@/lib/utils` → lib/utils.ts
- `@/hooks` → hooks directory

### shadcn/ui Configuration
- Style: `radix-maia`
- Components path: `@/components/ui`
- Utils path: `@/lib/utils`
- CSS variables: Enabled with neutral base color
- Icon library: lucide-react

## Fonts
Three fonts are configured in layout.tsx:
- **Inter**: Primary sans font (--font-sans)
- **Geist**: Secondary sans font (--font-geist-sans)
- **Geist Mono**: Monospace font (--font-geist-mono)

## TypeScript Configuration
- Target: ES2017
- Module resolution: bundler
- Strict mode: enabled
- JSX: react-jsx
- All TypeScript files use `.tsx` or `.ts` extensions

## Styling Approach
Use Tailwind CSS utility classes combined with the `cn()` helper from `@/lib/utils` for conditional class merging. The project uses Tailwind v4 with PostCSS plugin.

## ESLint Configuration
Uses ESLint v9 flat config (eslint.config.mjs) with Next.js presets:
- Core Web Vitals rules
- TypeScript rules
- Custom global ignores for .next/, out/, build/

## Component Development
When adding UI components, use shadcn/ui CLI or manually add to `components/ui/`. All components should follow the Radix Maia style variant and use TypeScript with proper type definitions.

## Agent & Skill Selection Strategy

**CRITICAL**: Before starting any task, carefully analyze which specialized agent or skill is best suited for the job. This enables efficient parallel development with minimum conflicts.

### Selection Guidelines
- **Think before acting**: Don't default to doing everything yourself
- **Evaluate task requirements**: Consider the domain expertise needed (frontend, backend, database, testing, etc.)
- **Check for specialists**: Review available agents/skills that match the task domain
- **Enable parallelization**: Tasks that can run independently should use separate agents in parallel
- **Minimize conflicts**: Different agents working on different areas reduce merge conflicts and context switching
- **Use AskUserQuestion during planning**: When executing plans or features, use the AskUserQuestion tool proactively during the planning phase to gather missing context, clarify ambiguities, or confirm assumptions. This enables more autonomous execution by resolving uncertainties early rather than making incorrect assumptions.

### Common Scenarios
- **UI/Component work**: Consider frontend-developer or nextjs-app-router-developer agents
- **Code review**: Use code-reviewer agent after significant changes
- **Testing**: Use test-automator for comprehensive test suite creation
- **Database work**: Use database-optimizer or sql-expert agents
- **API development**: Use backend-architect or api-documenter agents
- **Performance**: Use performance-engineer agent
- **Security**: Use security-auditor agent

### Parallel Execution
When multiple independent tasks exist, invoke agents in parallel using a single message with multiple Task tool calls to maximize efficiency.

### Available MCP Tools

**Use these specialized tools to test and bulletproof features:**

- **Context7 MCP**: Use for framework-specific documentation and best practices
  - Query latest Next.js, React, TypeScript patterns
  - Get up-to-date library API references
  - Verify current framework conventions before implementation

- **ShadCN MCP**: Use for shadcn/ui component development
  - Search and discover shadcn/ui components
  - View component implementation details and usage examples
  - Get component demo code and dependencies
  - Verify component compatibility with Radix Maia style variant

- **Sequential Thinking MCP**: Use for complex problem-solving
  - Breaking down long, challenging issues into steps
  - Multi-step reasoning for architectural decisions
  - Complex debugging scenarios requiring systematic analysis
  - Planning features with many interdependencies

- **Chrome DevTools MCP**: Use for local UX/UI testing and validation
  - Quick visual testing of components and layouts
  - Responsive design verification
  - Performance profiling and Core Web Vitals
  - Accessibility testing
  - Console error checking
  - Network request inspection
  - **Always test features locally before considering them complete**

### Testing & Quality Workflow
1. Implement feature using appropriate agents
2. Use Context7 to verify framework best practices
3. Test locally with Chrome DevTools MCP for UX/UI validation
4. Use Sequential Thinking for complex debugging if issues arise
5. Consider code-reviewer agent for final review

## Browser Testing Best Practices

**CRITICAL**: Always perform browser testing before marking UI features as complete. Use the Playwright MCP tools for fast, reliable browser automation.

### Pre-Testing Checklist

Before starting browser tests, verify:

1. **Dev server is running on correct port**
   - Default: `npm run dev` → http://localhost:3000
   - Check `.env.local` for `NEXT_PUBLIC_APP_URL` value
   - Ensure no port mismatches between environment variables and actual server

2. **Environment variables are consistent**
   - Verify `BETTER_AUTH_URL` matches dev server port
   - Verify `NEXT_PUBLIC_APP_URL` matches dev server port
   - Common pitfall: Hardcoded ports in code vs environment variables

3. **No stale dev server processes**
   - If port conflicts occur: `npx kill-port 3000`
   - Remove lock files if needed: `rm -f .next/dev/lock`
   - Full restart ensures fresh build: `npm run dev`

### Fast Browser Testing Workflow

Use Playwright MCP tools for browser automation (no .sh files):

```typescript
// Step 1: Navigate to the page
browser_navigate("http://localhost:3000/dashboard/streams/xyz")

// Step 2: Resize viewport if needed
browser_resize(1280, 720) // Desktop
browser_resize(375, 667)  // Mobile

// Step 3: Take accessibility snapshot (faster than screenshot for verification)
browser_snapshot()

// Step 4: Take screenshots for visual verification
browser_take_screenshot({ filename: "feature-test.png" })

// Step 5: Interact with elements
browser_click({ element: "Add Stream button", ref: "..." })
browser_type({ element: "Video ID input", ref: "...", text: "dQw4w9WgXcQ" })

// Step 6: Verify console logs
browser_console_messages({ level: "error" })

// Step 7: Check network requests
browser_network_requests({ includeStatic: false })
```

### Common Browser Testing Pitfalls

**1. Port Mismatch Issues**
- **Symptom**: Auth fails with "net::ERR_CONNECTION_REFUSED"
- **Cause**: Auth client pointing to wrong port (e.g., 3001 when server runs on 3000)
- **Fix**:
  - Check `lib/auth-client.ts` baseURL
  - Check `.env.local` BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL
  - Ensure all environment variables use same port
  - Restart dev server after changes

**2. Cached JavaScript Issues**
- **Symptom**: Browser uses old code despite file changes
- **Cause**: Fast Refresh doesn't always catch auth client changes
- **Fix**:
  - Full dev server restart: Stop server, `npm run dev`
  - Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
  - Clear Next.js cache if needed: `rm -rf .next`

**3. Lock File Conflicts**
- **Symptom**: "Unable to acquire lock at .next/dev/lock"
- **Cause**: Previous dev server didn't clean up properly
- **Fix**:
  - Kill port: `npx kill-port 3000`
  - Remove lock: `rm -f .next/dev/lock`
  - Restart: `npm run dev`

**4. Test Credentials Not Working**
- **Symptom**: Sign-in fails with valid credentials
- **Cause**: Port mismatch prevents auth verification
- **Fix**:
  - Verify auth endpoints are accessible: curl http://localhost:3000/api/auth/session
  - Check browser Network tab for 404 or connection errors
  - Ensure Better Auth is configured for correct port

### Browser Testing Performance Tips

1. **Use accessibility snapshots for verification** (faster than screenshots)
   - `browser_snapshot()` returns full page structure
   - Can search for text content without visual rendering
   - Use for element existence checks and state verification

2. **Take screenshots sparingly** (slower, use for visual proof)
   - Only take screenshots when visual proof is needed
   - Use targeted element screenshots vs full page when possible
   - Store screenshots in `.playwright-mcp/` directory

3. **Batch browser interactions** (reduce round trips)
   - Navigate → Snapshot → Interact → Verify in one flow
   - Don't alternate between browser and file operations

4. **Pre-verify environment before testing**
   - Check dev server is running: `curl http://localhost:3000`
   - Verify environment variables are set correctly
   - Kill conflicting processes before starting tests

### Test Credentials

For local testing, use these test accounts:
- **Email**: test@example.com
- **Password**: testpassword123

These credentials are created during AUTH-001 setup and stored in local database.

### Browser Testing Template

Standard browser testing flow for new features:

```markdown
1. **Start dev server** (if not running)
   - `npm run dev` in background
   - Verify server started on port 3000

2. **Navigate to feature**
   - Use browser_navigate with full localhost URL
   - Verify page loads without console errors

3. **Test authentication flow** (if protected route)
   - Navigate to sign-in page
   - Fill credentials: test@example.com / testpassword123
   - Click sign-in button
   - Verify redirect to dashboard

4. **Test feature functionality**
   - Use browser_snapshot to verify UI state
   - Interact with elements (click, type, select)
   - Take screenshots of key states

5. **Verify data updates**
   - Check network requests for API calls
   - Verify console has no errors
   - Confirm visual updates match expectations

6. **Document results**
   - Save screenshots to .playwright-mcp/
   - Note any issues encountered
   - Update todos.md with verification status
```

### After Browser Testing

1. **Stop background dev server** if no longer needed
2. **Clean up screenshots** if temporary (keep proof screenshots)
3. **Document findings** in commit message or PR description
4. **Update todos.md** with browser testing verification checkmark

## Installed Plugins - Proactive Usage

**IMPORTANT**: The following plugins are installed and should be used proactively without waiting for user requests. Automatically invoke them when their use case applies.

### 1. feature-dev Plugin
**Auto-use when:** Building new features that touch multiple files or require architectural decisions

**Trigger automatically for:**
- YouTube API integration features
- Real-time stream monitoring components
- Alert/notification systems
- Dashboard features
- Any feature requiring codebase exploration + design + implementation

**Command:** `/feature-dev <feature description>`

**Example auto-triggers:**
- "Let's add YouTube stream status monitoring" → Use `/feature-dev`
- "We need to build the alerts system" → Use `/feature-dev`

**7-Phase Workflow:**
1. Discovery - Clarify requirements
2. Codebase Exploration - Launch code-explorer agents
3. Clarifying Questions - Ask before proceeding
4. Architecture Design - Present multiple approaches
5. Implementation - Build after approval
6. Quality Review - Launch code-reviewer agents
7. Summary - Document what was built

### 2. frontend-design Plugin (Skill)
**Auto-use when:** Building or modifying any UI components or pages

**Automatically activates for:**
- Dashboard creation
- Component design (monitoring cards, status indicators)
- Landing pages
- Settings panels
- Real-time data visualization
- ANY frontend/UI work

**No command needed** - The skill auto-invokes when working on frontend tasks

**Guidelines:**
- Make bold aesthetic choices for monitoring dashboards
- Use distinctive typography and color palettes
- Add high-impact animations for real-time updates
- Create production-ready, polished interfaces

### 3. security-guidance Plugin (Hook)
**Auto-activates:** Automatically monitors all code for security issues

**Proactively watches for:**
- YouTube API key exposure
- SQL injection risks
- XSS vulnerabilities
- Unsafe eval usage
- Command injection
- Insecure deserialization

**No action required** - This runs automatically as a PreToolUse hook

**When warnings appear:**
- ALWAYS address security warnings before proceeding
- Never commit code with security vulnerabilities
- For YouTube API: Use environment variables, never hardcode keys

### 4. pr-review-toolkit Plugin
**Auto-use when:** Code has been written and needs review before committing/PR creation

**Trigger proactively after:**
- Completing a feature implementation
- Adding new components or services
- Modifying error handling
- Adding tests
- Before running `/commit` or `/commit-push-pr`

**Available agents (use as needed):**
```
"Review test coverage" → pr-test-analyzer
"Check error handling" → silent-failure-hunter
"Verify comments are accurate" → comment-analyzer
"Review the StreamMonitor type" → type-design-analyzer
"General code review" → code-reviewer
"Simplify this implementation" → code-simplifier
```

**Proactive workflow:**
1. After writing code → Automatically trigger code-reviewer
2. After adding error handling → Automatically trigger silent-failure-hunter
3. Before creating PR → Automatically trigger pr-test-analyzer + comment-analyzer
4. After code review passes → Consider code-simplifier for polish

### 5. commit-commands Plugin
**Auto-use when:** Changes are ready to be committed

**Commands to use proactively:**

**After completing work:**
```bash
/commit              # Auto-generates commit message from changes
```

**When ready for PR:**
```bash
/commit-push-pr      # Commits + pushes + creates PR with summary
```

**After merging PRs:**
```bash
/clean_gone          # Removes stale local branches
```

**Proactive triggers:**
- User says "commit these changes" → Use `/commit`
- User says "create a PR" or "ready to merge" → Use `/commit-push-pr`
- After multiple PRs merged → Suggest `/clean_gone`

## Plugin Integration Workflow

**Complete feature development flow:**

1. **Start feature** → `/feature-dev <description>`
   - Discovery, exploration, architecture design

2. **Frontend work** → frontend-design skill auto-activates
   - Build production-grade UI components

3. **Security check** → security-guidance hook auto-monitors
   - Catches vulnerabilities as you code

4. **Code review** → Proactively launch pr-review-toolkit agents
   ```
   "Review my code before committing"
   ```

5. **Commit** → `/commit`
   - Auto-generates appropriate commit message

6. **Create PR** → `/commit-push-pr`
   - Commits, pushes, creates PR with summary

7. **Cleanup** → `/clean_gone` (after merging)
   - Remove stale branches

## TODO Management System

**CRITICAL**: The `todos.md` file is the single source of truth for all project tasks and dependencies. ALWAYS maintain this file when adding new work or completing tasks.

### When to Update todos.md

1. **Before Starting Any Work**
   - Read todos.md to understand current task status and dependencies
   - Identify which tasks are 🟡 Ready (all dependencies met)
   - Update task status to 🟢 In Progress before starting
   - Update `Last Updated` timestamp at top of file

2. **When User Requests New Work**
   - Add new tasks to appropriate phase section
   - Assign unique task ID (format: `CATEGORY-XXX`)
   - Set priority: P0 (Must Have), P1 (Should Have), P2 (Nice to Have), P3 (Future)
   - Identify all dependencies on existing tasks
   - Set initial status: 🔴 Blocked or 🟡 Ready
   - Break large requests into smaller subtasks
   - Commit changes: `chore: update todos - added [TASK-ID]`

3. **When Completing Tasks**
   - Mark task as ✅ Completed
   - Update `Last Updated` timestamp
   - Check all blocked tasks that depend on completed task
   - Update dependent tasks from 🔴 Blocked to 🟡 Ready
   - Update Phase status if all phase tasks completed
   - Commit changes: `chore: update todos - completed [TASK-ID]`

4. **When Dependencies Change**
   - If a task is split or refactored, update dependency references
   - Unblock tasks when dependencies are removed
   - Update task IDs if tasks are reorganized

### Task Status Legend

- 🔴 **Blocked** - Cannot start due to incomplete dependencies
- 🟡 **Ready** - All dependencies met, can start immediately
- 🟢 **In Progress** - Currently being worked on
- ✅ **Completed** - Finished and verified
- ⏸️ **Deferred** - Postponed to future phase/version

### Task Structure Template

```markdown
### CATEGORY-XXX: Task Name
**Status:** 🟡 Ready
**Priority:** P0
**Depends on:** TASK-001, TASK-002
**Tasks:**
- [ ] Subtask 1
- [ ] Subtask 2
- [ ] Subtask 3
```

### Dependency Management Rules

1. **Never start a blocked task** - Always wait for dependencies to complete
2. **Update dependency status immediately** - When a task completes, unblock dependents
3. **Document new dependencies** - If work reveals new dependencies, add them
4. **Prefer small tasks** - Break large tasks into smaller ones with clearer dependencies
5. **Use parallel execution** - Tasks without dependencies can run in parallel

### Integration with Development Workflow

**Step 1: Check todos.md**
```bash
# Before starting work, review current state
cat todos.md | grep "🟡 Ready" -A 5
```

**Step 2: Update status to In Progress**
- Change status emoji from 🟡 to 🟢
- Update timestamp
- Commit: `chore: update todos - starting [TASK-ID]`

**Step 3: Complete work**
- Implement feature/fix
- Test thoroughly
- Run code review if needed

**Step 4: Mark as completed**
- Change status from 🟢 to ✅
- Check subtasks all marked complete
- Unblock dependent tasks
- Update timestamp
- Commit: `chore: update todos - completed [TASK-ID]`

### Example Workflow

```
User: "Add authentication with better-auth"

Claude Actions:
1. Read todos.md
2. Find AUTH-001 task (Better Auth Integration)
3. Check dependencies: SETUP-001, SETUP-005
4. If dependencies met:
   - Update status to 🟢 In Progress
   - Work on subtasks
   - Mark subtasks complete as they finish
   - When all subtasks done, mark AUTH-001 as ✅
   - Update AUTH-002 from 🔴 to 🟡 (dependency satisfied)
   - Commit updates to todos.md
5. If dependencies not met:
   - Notify user of blocking tasks
   - Offer to work on dependencies first
```

### Proactive TODO Maintenance

**After Every Feature Implementation:**
1. Mark completed tasks as ✅
2. Add any discovered subtasks or refinements
3. Update estimates if timeline changed
4. Document any technical debt discovered

**Weekly Review (Manual):**
1. Review all 🟢 In Progress tasks
2. Close abandoned or stale tasks
3. Re-prioritize based on project needs
4. Update phase completion percentages

**Before Milestones/Releases:**
1. Verify all P0 tasks for milestone are ✅
2. Document any P0 tasks deferred to next milestone
3. Update Phase status in todos.md header
4. Create summary of completed work

### Integration with Plugins

**feature-dev Plugin:**
- Automatically checks todos.md for related tasks
- Updates task status when feature work starts
- Creates new tasks if feature requires additional work

**pr-review-toolkit Plugin:**
- Marks review tasks complete after code review
- Creates follow-up tasks for review findings
- Updates todos.md with review status

**commit-commands Plugin:**
- Includes relevant task IDs in commit messages
- Suggests marking tasks complete if all work done
- Links commits to specific todo items

### Command Reference

```bash
# View ready tasks
grep "🟡 Ready" todos.md

# View in-progress tasks
grep "🟢 In Progress" todos.md

# View all Phase 1 tasks
sed -n '/## Phase 1/,/## Phase 2/p' todos.md

# Count completed tasks
grep -c "✅" todos.md

# Find task by ID
grep -A 10 "AUTH-001" todos.md
```

## Best Practices
- Use Server Components by default (RSC enabled)
- Apply `cn()` utility for className composition
- Follow shadcn/ui patterns for component structure
- Keep strict TypeScript types
- Use Context7 MCP for library/framework documentation lookups
- **Always maintain todos.md** - Update before starting work and after completing tasks
