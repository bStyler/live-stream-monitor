/**
 * Admin Impersonation Status API
 * GET /api/admin/impersonate/status - Check current impersonation status
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get('impersonation_session');

    if (!impersonationCookie) {
      return NextResponse.json({
        active: false,
        impersonation: null,
      });
    }

    const impersonationData = JSON.parse(impersonationCookie.value);

    return NextResponse.json({
      active: true,
      impersonation: impersonationData,
    });
  } catch (error) {
    console.error('Error checking impersonation status:', error);
    return NextResponse.json(
      { error: 'Failed to check impersonation status' },
      { status: 500 }
    );
  }
}
