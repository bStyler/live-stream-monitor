/**
 * Admin User Detail API - Update and delete specific users
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Soft delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { db } from '@/db/drizzle';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await req.json();
    const { name, email, role, streamQuota, isActive } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (streamQuota !== undefined) updateData.streamQuota = streamQuota;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update user
    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete user (mark as inactive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;

    // Soft delete: mark as inactive
    await db
      .update(user)
      .set({ isActive: false })
      .where(eq(user.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
