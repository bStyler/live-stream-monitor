import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  return Response.json({
    hasCronSecret: !!cronSecret,
    secretLength: cronSecret?.length || 0,
    firstChar: cronSecret?.[0] || '',
    lastChar: cronSecret?.[cronSecret.length - 1] || '',
  });
}
