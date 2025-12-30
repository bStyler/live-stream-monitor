# Tech Stack Documentation - Live Stream Monitor

**Generated:** 2025-12-30
**Project:** Next.js 16 Live Stream Monitoring Application

This document provides comprehensive documentation for the entire tech stack used in the Live Stream Monitor project, focusing on 2025 best practices and latest patterns.

---

## Table of Contents

1. [Core Frameworks](#1-core-frameworks)
2. [Database & ORM](#2-database--orm)
3. [Authentication](#3-authentication)
4. [UI Components](#4-ui-components)
5. [External APIs](#5-external-apis)
6. [Deployment](#6-deployment)
7. [Library Comparisons](#7-library-comparisons)

---

## 1. Core Frameworks

### Next.js 16 App Router

**Context7 Library ID:** `/vercel/next.js/v16.1.0`

#### Key Architecture Patterns

**Server Components (Default)**
```typescript
// app/page.tsx - Server Component by default
async function getPosts() {
  const res = await fetch('https://...', { cache: 'force-cache' })
  const posts = await res.json()
  return posts
}

export default async function Page() {
  // Fetch data directly in Server Component
  const recentPosts = await getPosts()
  return <HomePage recentPosts={recentPosts} />
}
```

**Data Fetching Strategies**

Next.js 16 provides three primary caching strategies:

1. **Static Data (force-cache)** - Similar to `getStaticProps`
```typescript
const staticData = await fetch(`https://...`, { cache: 'force-cache' })
```

2. **Dynamic Data (no-store)** - Similar to `getServerSideProps`
```typescript
const dynamicData = await fetch(`https://...`, { cache: 'no-store' })
```

3. **Revalidated Data** - ISR pattern
```typescript
const revalidatedData = await fetch(`https://...`, {
  next: { revalidate: 10 }, // revalidate every 10 seconds
})
```

4. **Tag-based Revalidation**
```typescript
const taggedData = await fetch(`https://...`, {
  next: { tags: ['products'] },
})
```

**Best Practices:**
- Use Server Components by default - they reduce JavaScript sent to client
- Fetch data at the component level, not in layout files
- Use `cache: 'no-store'` for real-time data like live stream status
- Implement tag-based revalidation for selective cache invalidation

---

### React 19 Server Components

**Context7 Library ID:** `/facebook/react/v19_2_0`

#### Server Actions

**Defining Server Actions**
```typescript
async function logOnServer(message: string) {
  "use server"
  console.log(message)
}

async function App({ children }) {
  // Can be used in Server Components
  logOnServer('used from server')
  return children
}
```

**Passing to Client Components**
```tsx
// Server Component
import { ClientComp } from './client-comp'

export default function Page() {
  async function handleSubmit(formData: FormData) {
    'use server'
    // Process form data
  }

  return <ClientComp onSubmit={handleSubmit} />
}
```

#### New Hooks in React 19

**useActionState** - For form actions with state
```typescript
import { useActionState } from 'react'

function Component() {
  const [actionState, dispatchAction] = useActionState()
  const onSubmitAction = () => {
    dispatchAction()
  }
  return <form onSubmit={onSubmitAction} />
}
```

**Best Practices:**
- Use `"use server"` directive for server-side mutations
- Server Actions work seamlessly with forms
- Combine with `useActionState` for optimistic updates
- Keep server actions in separate files for better organization

---

### TypeScript Strict Mode

**Current Configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Best Practices:**
- Always enable `strict: true`
- Use type inference with Zod schemas
- Leverage `@/*` path aliases for clean imports
- Use TypeScript for all `.tsx` and `.ts` files

---

### Tailwind CSS v4 with PostCSS

**Context7 Library ID:** `/websites/tailwindcss`

#### PostCSS Configuration (2025)

**postcss.config.mjs**
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  }
}
```

**Important:** In Tailwind v4, `postcss-import` and `autoprefixer` are handled automatically by the framework.

#### CSS Variables for Theming

**app/globals.css**
```css
@import "tailwindcss";

/* Optional: Custom dark mode variant */
@custom-variant dark (&:where(.dark, .dark *));
```

#### Dark Mode Patterns

**System Preference (Default)**
```html
<div class="bg-white dark:bg-gray-900">
  <h3 class="text-gray-900 dark:text-white">Content</h3>
</div>
```

**Manual Toggle (Class-based)**
```css
@custom-variant dark (&:where(.dark, .dark *));
```

**Best Practices:**
- Use CSS variables for theme colors
- Prefer `@tailwindcss/postcss` plugin over legacy setup
- Use `cn()` utility from `lib/utils.ts` for className composition
- Design with dark mode from the start

---

## 2. Database & ORM

### Vercel Postgres

**Official Documentation:** [Vercel Postgres](https://vercel.com/docs/postgres)

#### Setup & Environment Variables

When connecting Vercel Postgres to your project, it automatically creates:
- `POSTGRES_URL` - For pooled connections (recommended)
- `POSTGRES_URL_NON_POOLING` - For direct connections

**Local Development:**
```bash
# Navigate to .env.local tab in Vercel dashboard
# Click "Show secret" and "Copy Snippet"
# Paste into your local .env file
```

#### Connection Pooling Best Practices

**Global Pool Setup**
```typescript
import { createPool } from '@vercel/postgres'

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
})
```

**Key Considerations:**
- Define pool globally to reuse across requests
- Set low idle timeout (~5 seconds) for unused connections
- Vercel's Fluid Compute shares function instances and global state
- Multiple invocations can reuse database connections

---

### Drizzle ORM

**Context7 Library ID:** `/drizzle-team/drizzle-orm-docs`

#### Schema Definition with Timestamps

**Basic Table Schema**
```typescript
import { serial, text, timestamp, pgTable } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").$type<"admin" | "customer">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").notNull().$onUpdate(() => new Date()),
})
```

**Reusable Timestamp Pattern**
```typescript
// lib/db/columns.helpers.ts
export const timestamps = {
  updated_at: timestamp(),
  created_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
}

// lib/db/schema/users.ts
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  ...timestamps
})
```

#### Indexing Strategies for Time-Series Data

**Time-Series Table with Indexes**
```typescript
import { serial, text, index, pgTable, timestamp, integer } from "drizzle-orm/pg-core"

export const streamMetrics = pgTable("stream_metrics", {
  id: serial("id").primaryKey(),
  streamId: text("stream_id").notNull(),
  viewerCount: integer("viewer_count").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("stream_id_idx").on(table.streamId),
  index("timestamp_idx").on(table.timestamp),
  // Composite index for common queries
  index("stream_timestamp_idx").on(table.streamId, table.timestamp),
])
```

#### Type Inference

```typescript
export type InsertUser = typeof users.$inferInsert
export type SelectUser = typeof users.$inferSelect

export type InsertStreamMetric = typeof streamMetrics.$inferInsert
export type SelectStreamMetric = typeof streamMetrics.$inferSelect
```

**Best Practices:**
- Use composite indexes for frequent query patterns
- Add timestamps to all tables for auditing
- Use `$onUpdate` for automatic `updatedAt` fields
- Leverage TypeScript inference for type safety
- Use `notNull()` for required fields

---

### Drizzle ORM vs Prisma (2025 Comparison)

**Sources:**
- [Drizzle vs Prisma: the Better TypeScript ORM in 2025](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Better Stack Community Guide](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/)
- [Drizzle ORM Benchmarks](https://orm.drizzle.team/benchmarks)

#### Performance Comparison

**Drizzle Advantages:**
- ~7kb minified+gzipped with zero binary dependencies
- Negligible cold start impact (ideal for serverless)
- Up to 14x lower latency than ORMs with N+1 problems
- 4.6k req/s with ~100ms p95 latency (370k PostgreSQL records)
- No additional abstraction layers - compiles to optimized SQL

**Prisma Trade-offs:**
- Requires spawning Rust query engine binary
- Adds measurable cold start latency despite optimizations
- Query batching and Prisma Accelerate reduce round-trips
- Superior developer experience and tooling

#### Recommendation

**Choose Drizzle for:**
- Performance-sensitive apps (real-time systems, analytics, fintech)
- Serverless environments (AWS Lambda, Vercel Edge, Cloudflare Workers)
- Time-series data workloads requiring high throughput
- Minimal bundle size requirements

**Choose Prisma for:**
- Teams prioritizing developer experience
- Projects needing comprehensive tooling (Prisma Studio, migrations UI)
- Complex schema relationships
- Teams new to SQL

**For Live Stream Monitor:** Drizzle is recommended due to:
- Vercel serverless deployment
- Real-time monitoring requirements
- Time-series metrics data
- Need for optimal cold start performance

---

## 3. Authentication

### Better Auth

**Context7 Library ID:** `/www.better-auth.com/llmstxt`
**Official Docs:** [Better Auth](https://www.better-auth.com/docs/introduction)

#### PostgreSQL Setup

**Installation**
```bash
npm install better-auth pg
```

**Basic Configuration**
```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL
  }),
  emailAndPassword: {
    enabled: true,
  },
})
```

#### Social Providers Setup

**GitHub & Google OAuth**
```typescript
import { betterAuth } from "better-auth"
import { Pool } from "pg"

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }
  }
})
```

#### Environment Variables Required

```env
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

**Best Practices:**
- Always use environment variables for credentials
- Enable email/password alongside social providers
- Use PostgreSQL adapter for session persistence
- Store secrets in Vercel environment variables
- Never commit credentials to version control

---

## 4. UI Components

### shadcn/ui with Radix Maia Style

**Context7 Library ID:** `/websites/ui_shadcn`
**Official Docs:** [shadcn/ui](https://ui.shadcn.com)

#### Installation & Configuration

**Initialize Project**
```bash
npx shadcn@latest init
```

**Interactive Prompts:**
```
Which style would you like to use? › Radix Maia
Which color would you like to use as base color? › Neutral
Where is your global CSS file? › app/globals.css
Do you want to use CSS variables for colors? › yes
Where is your tailwind.config.js located? › tailwind.config.js
Configure the import alias for components: › @/components
Configure the import alias for utils: › @/lib/utils
Are you using React Server Components? › yes
```

#### components.json Configuration

```json
{
  "style": "radix-maia",
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### Component Usage Pattern

```tsx
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div>
      <Button>Click me</Button>
    </div>
  )
}
```

#### Adding Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add form
```

**Best Practices:**
- Use CSS variables for theming
- Enable React Server Components support
- Follow Radix Maia style variant for consistency
- Customize components after adding them
- Use `cn()` utility for className composition

---

### React Hook Form with Zod

**Context7 Library IDs:**
- React Hook Form: `/react-hook-form/documentation`
- Resolvers: `/react-hook-form/resolvers`

#### Installation

```bash
npm install react-hook-form @hookform/resolvers zod
```

#### Form with Zod Validation

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(18, "Must be 18 or older"),
  email: z.string().email("Invalid email address"),
})

type FormData = z.infer<typeof schema>

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <p>{errors.name.message}</p>}

      <input {...register("age", { valueAsNumber: true })} type="number" />
      {errors.age && <p>{errors.age.message}</p>}

      <input {...register("email")} type="email" />
      {errors.email && <p>{errors.email.message}</p>}

      <button type="submit">Submit</button>
    </form>
  )
}
```

#### Integration with shadcn/ui Form Components

```typescript
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
})

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

**Best Practices:**
- Always use Zod for schema validation
- Use `z.infer` for type inference
- Cannot mix Zod resolver with built-in validators
- Use `valueAsNumber` for numeric inputs
- Integrate with shadcn/ui Form components for consistency

---

### Chart Libraries: Recharts vs Tremor

**Context7 Library ID:** `/recharts/recharts`

**Sources:**
- [Top 5 Data Visualization Libraries 2025](https://dev.to/burcs/top-5-data-visualization-libraries-you-should-know-in-2025-21k9)
- [NPM Trends Comparison](https://npmtrends.com/@tremor/react-vs-recharts)
- [React Chart Libraries](https://www.kylegill.com/essays/react-chart-libraries)

#### Comparison Overview

**Key Relationship:** Tremor is built on top of Recharts, providing a higher-level abstraction.

**Popularity (2025 NPM Downloads):**
- Recharts: 9,489,095 weekly downloads | 26,385 GitHub stars
- Tremor: 139,066 weekly downloads | 16,444 GitHub stars

#### Recharts

**Installation**
```bash
npm install recharts
```

**Line Chart Example**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Jan', viewers: 4000, chatMessages: 2400 },
  { name: 'Feb', viewers: 3000, chatMessages: 1398 },
  { name: 'Mar', viewers: 2000, chatMessages: 9800 },
]

export function ViewerChart() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="viewers"
          stroke="#8884d8"
          strokeWidth={2}
          activeDot={{ r: 8 }}
        />
        <Line
          type="monotone"
          dataKey="chatMessages"
          stroke="#82ca9d"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Custom Tooltip**
```tsx
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-md shadow-lg">
        <p className="font-bold">{label}</p>
        <p className="text-blue-600">
          Viewers: {payload[0].value}
        </p>
        {payload[0].payload.status && (
          <p className="text-sm text-gray-500">
            Status: {payload[0].payload.status}
          </p>
        )}
      </div>
    )
  }
  return null
}

<Tooltip content={<CustomTooltip />} />
```

**Strengths:**
- Built on React and D3
- SVG-based (readable markup, CSS styling)
- Simple, declarative API
- Excellent for getting charts up quickly
- Flexible customization

**Limitations:**
- Less opinionated (requires more configuration)
- No built-in dashboard components

#### Tremor

**Installation**
```bash
npm install @tremor/react
```

**Built on:**
- React
- Tailwind CSS
- Radix UI
- Recharts

**Strengths:**
- 35+ fully open-source components
- Beautiful defaults out of the box
- Dashboard-ready components
- Accessibility and keyboard navigation
- Perfect for rapid prototyping

**Limitations:**
- Less configurable than raw Recharts
- Requires Tailwind CSS
- Chart capabilities limited by underlying Recharts

#### Recommendation for Live Stream Monitor

**Use Recharts for:**
- Real-time viewer count charts
- Stream metrics visualization
- Custom tooltips with live stream data
- Maximum flexibility and customization
- Fine-grained control over chart behavior

**Use Tremor for:**
- Dashboard overview components
- Quick prototyping of analytics views
- Consistent styling with minimal effort

**Recommended Choice:** **Recharts**
- More flexibility for real-time data updates
- Better control over streaming chart animations
- Lighter weight (no dependency on Tremor's extra components)
- Direct integration with shadcn/ui styling

---

## 5. External APIs

### YouTube Data API v3

**Sources:**
- [YouTube Data API v3 Guide](https://elfsight.com/blog/youtube-data-api-v3-limits-operations-resources-methods-etc/)
- [YouTube API Getting Started 2025](https://www.getphyllo.com/post/youtube-api-and-api-key-explained-how-to-get-started-in-2025)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Official Overview](https://developers.google.com/youtube/v3/getting-started)

#### Authentication Methods

**1. API Key (Simple Data Fetching)**
```typescript
// lib/youtube.ts
import { google } from '@googleapis/youtube'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

export async function getVideoDetails(videoId: string) {
  const response = await youtube.videos.list({
    part: ['snippet', 'liveStreamingDetails', 'statistics'],
    id: [videoId],
  })

  return response.data.items?.[0]
}
```

**2. OAuth 2.0 (User Authorization)**
```typescript
import { google } from '@googleapis/youtube'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// Required scope for uploads
const scopes = ['https://www.googleapis.com/auth/youtube.upload']
```

#### Quota System

**Daily Quota:** 10,000 units per project (resets at midnight PT)

**Common Operation Costs:**
- Search request: 100 units
- Retrieve video details: 1 unit
- Upload a video: 1,600 units
- List live streams: 1 unit

**Example Quota Calculation:**
```
Daily monitoring (checks every 5 minutes):
- 288 checks/day × 1 unit = 288 units
- Remaining quota: 9,712 units for other operations
```

**Requesting Higher Quotas:**
- Fill out [Quota Extension Request Form](https://support.google.com/youtube/contact/yt_api_form)
- Free of charge (no cost for quota increases)
- Approval based on application merits and compliance

#### Live Streaming API

**Check Live Stream Status**
```typescript
export async function getLiveStreamStatus(videoId: string) {
  const response = await youtube.videos.list({
    part: ['liveStreamingDetails'],
    id: [videoId],
  })

  const liveDetails = response.data.items?.[0]?.liveStreamingDetails

  return {
    isLive: liveDetails?.actualStartTime && !liveDetails?.actualEndTime,
    scheduledStartTime: liveDetails?.scheduledStartTime,
    actualStartTime: liveDetails?.actualStartTime,
    actualEndTime: liveDetails?.actualEndTime,
    concurrentViewers: liveDetails?.concurrentViewers,
  }
}
```

**Best Practices:**
- Store API keys in environment variables (never hardcode)
- Use API keys for read-only operations
- Implement OAuth 2.0 for user-specific actions
- Monitor quota usage to avoid 403 quotaExceeded errors
- Cache responses when possible (use Next.js cache)
- Implement exponential backoff for rate limit handling

---

### Resend Email API with React Email

**Sources:**
- [Send emails with Next.js - Resend](https://resend.com/docs/send-with-nextjs)
- [React Email Guide](https://www.freecodecamp.org/news/create-and-send-email-templates-using-react-email-and-resend-in-nextjs/)
- [Resend Integration Tutorial](https://dev.to/thatanjan/send-emails-from-nextjs-with-resend-and-react-email-39fb)

#### Installation

```bash
npm install resend @react-email/components
```

#### Email Template (React)

**components/emails/stream-alert.tsx**
```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface StreamAlertEmailProps {
  streamerName: string
  streamTitle: string
  streamUrl: string
}

export function StreamAlertEmail({
  streamerName,
  streamTitle,
  streamUrl,
}: StreamAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{streamerName} is now live!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{streamerName} is now streaming</Heading>
          <Text style={text}>
            {streamTitle}
          </Text>
          <Text style={text}>
            <a href={streamUrl}>Watch now</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
}
```

#### API Route (Server Action)

**app/api/send-alert/route.ts**
```typescript
import { Resend } from 'resend'
import { StreamAlertEmail } from '@/components/emails/stream-alert'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { email, streamerName, streamTitle, streamUrl } = await request.json()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Stream Monitor <alerts@yourdomain.com>',
      to: [email],
      subject: `${streamerName} is now live!`,
      react: StreamAlertEmail({ streamerName, streamTitle, streamUrl }),
    })

    if (error) {
      return Response.json({ error }, { status: 400 })
    }

    return Response.json(data)
  } catch (error) {
    return Response.json({ error }, { status: 500 })
  }
}
```

#### Server Actions Pattern

```typescript
'use server'

import { Resend } from 'resend'
import { StreamAlertEmail } from '@/components/emails/stream-alert'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function sendStreamAlert(formData: FormData) {
  const email = formData.get('email') as string

  const { data, error } = await resend.emails.send({
    from: 'Stream Monitor <alerts@yourdomain.com>',
    to: [email],
    subject: 'Stream Alert',
    react: StreamAlertEmail({
      streamerName: 'Example Streamer',
      streamTitle: 'Live Stream Title',
      streamUrl: 'https://youtube.com/watch?v=...',
    }),
  })

  if (error) {
    throw new Error('Failed to send email')
  }

  return { success: true }
}
```

#### Environment Variables

```env
RESEND_API_KEY=re_123456789
```

#### Development Preview

```bash
# Run email preview server
npm run email:dev
# Open http://localhost:4000
```

**Best Practices:**
- Use React Email components for templates
- Store API key securely in environment variables
- Implement rate limiting for alert emails
- Use transactional email templates
- Test emails thoroughly in preview mode
- Configure proper sender domain in Resend dashboard

---

## 6. Deployment

### Vercel Deployment Configuration

**Sources:**
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [How to Setup Cron Jobs on Vercel](https://vercel.com/guides/how-to-setup-cron-jobs-on-vercel)
- [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

#### Cron Jobs Configuration

**vercel.json**
```json
{
  "crons": [
    {
      "path": "/api/check-streams",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cleanup-old-metrics",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule Syntax (Cron Format):**
```
*/5 * * * *  → Every 5 minutes
0 * * * *    → Every hour at :00
0 */6 * * *  → Every 6 hours
0 2 * * *    → Daily at 2:00 AM
0 0 * * 0    → Weekly on Sunday at midnight
0 0 1 * *    → Monthly on the 1st at midnight
```

#### API Route with Cron Security

**app/api/check-streams/route.ts**
```typescript
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Check stream status
    // Update database
    // Send alerts if needed

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Failed to check streams' }, { status: 500 })
  }
}
```

**Environment Variables:**
```env
CRON_SECRET=your_secret_here
```

**Important Notes:**
- Cron jobs only run for production deployments (not preview)
- Vercel automatically sends `CRON_SECRET` as `Authorization: Bearer {CRON_SECRET}`
- Duration limits match Vercel Function limits
- Vercel does not retry failed invocations
- Hobby plans: 2 cron jobs, triggered once per day maximum

#### Environment Variables Management

**Vercel Dashboard:**
1. Navigate to Project Settings → Environment Variables
2. Add variables for each environment:
   - Development
   - Preview
   - Production

**Critical Variables:**
```env
# Database
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# YouTube API
YOUTUBE_API_KEY=AIza...

# Authentication
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Email
RESEND_API_KEY=re_...

# Cron
CRON_SECRET=...

# Better Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://yourdomain.com
```

**Best Practices:**
- Never commit `.env` files to version control
- Use different values for development/production
- Rotate secrets regularly
- Use Vercel's encrypted environment variables
- Set appropriate variable scopes (development/preview/production)

---

### Next.js Build Configuration

**next.config.ts**
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Enable if needed
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Image optimization for YouTube thumbnails
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
    ],
  },
}

export default nextConfig
```

---

## 7. Library Comparisons

### Summary of Key Decisions

#### Drizzle ORM vs Prisma
**Chosen: Drizzle ORM**

**Reasons:**
- 14x lower latency for time-series queries
- ~7kb bundle (vs Prisma's Rust engine overhead)
- Negligible cold start (critical for Vercel serverless)
- Better performance for real-time monitoring
- Direct SQL compilation without abstraction layers

**Trade-off:** Less comprehensive tooling than Prisma

---

#### Recharts vs Tremor
**Chosen: Recharts (Primary)**

**Reasons:**
- More flexible for real-time chart updates
- Direct control over chart animations
- Lighter weight (no extra dashboard dependencies)
- Better integration with custom styling
- Tremor is built on Recharts anyway

**Consideration:** Use Tremor for rapid dashboard prototyping if needed

---

#### TanStack Query Data Fetching Strategy

**Context7 Library ID:** `/websites/tanstack_query`

**Recommendation:** Use TanStack Query for client-side data fetching only

**Pattern for Live Stream Monitor:**

**Server Components (Preferred for Initial Data)**
```typescript
// app/dashboard/page.tsx - Server Component
async function getStreams() {
  const res = await fetch('...', { cache: 'no-store' })
  return res.json()
}

export default async function Dashboard() {
  const streams = await getStreams()
  return <StreamList streams={streams} />
}
```

**TanStack Query (Client-side Real-time Updates)**
```typescript
'use client'

import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function StreamMonitor({ initialData }) {
  const { data } = useQuery({
    queryKey: ['stream-status'],
    queryFn: () => fetch('/api/stream-status').then(r => r.json()),
    refetchInterval: 30000, // Poll every 30 seconds
    initialData,
  })

  return <div>{data.viewerCount}</div>
}
```

**Best Practice:**
- Use Server Components for initial page load (faster FCP)
- Use TanStack Query for client-side polling/real-time updates
- Prefetch data on server, hydrate on client with `HydrationBoundary`

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database (Drizzle)
npx drizzle-kit generate # Generate migrations
npx drizzle-kit migrate  # Run migrations
npx drizzle-kit studio   # Open Drizzle Studio

# shadcn/ui
npx shadcn@latest init   # Initialize shadcn/ui
npx shadcn@latest add button  # Add component

# Email Preview
npm run email:dev        # Preview email templates

# Port Management
kill-port 3000           # Kill process on port 3000
```

---

## Additional Resources

### Next.js 16
- [Official Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)

### React 19
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)
- [Server Components](https://react.dev/reference/rsc/server-components)

### Drizzle ORM
- [Official Docs](https://orm.drizzle.team)
- [Drizzle with Vercel Postgres](https://orm.drizzle.team/docs/get-started-postgresql#vercel-postgres)

### Better Auth
- [Official Documentation](https://www.better-auth.com/docs/introduction)
- [PostgreSQL Adapter](https://www.better-auth.com/docs/adapters/postgresql)

### shadcn/ui
- [Official Components](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)

### TanStack Query
- [Official Docs](https://tanstack.com/query/latest)
- [Next.js Integration](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)

### Recharts
- [Official Documentation](https://recharts.org)
- [Examples](https://recharts.org/en-US/examples)

### YouTube Data API
- [Official Overview](https://developers.google.com/youtube/v3/getting-started)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)

### Resend
- [Official Documentation](https://resend.com/docs)
- [React Email](https://react.email)

### Vercel
- [Postgres Documentation](https://vercel.com/docs/postgres)
- [Cron Jobs Guide](https://vercel.com/docs/cron-jobs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Maintained By:** Framework Documentation Researcher
