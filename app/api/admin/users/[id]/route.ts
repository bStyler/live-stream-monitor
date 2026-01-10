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
import { logUserEdit, logUserDelete, logRoleChange } from '@/lib/activity-logger';

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

    // Get current user data for logging
    const [oldUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!oldUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    const changes: Record<string, { old: any; new: any }> = {};

    if (name !== undefined && name !== oldUser.name) {
      updateData.name = name;
      changes.name = { old: oldUser.name, new: name };
    }
    if (email !== undefined && email !== oldUser.email) {
      updateData.email = email;
      changes.email = { old: oldUser.email, new: email };
    }
    if (role !== undefined && role !== oldUser.role) {
      updateData.role = role;
      changes.role = { old: oldUser.role, new: role };
    }
    if (streamQuota !== undefined && streamQuota !== oldUser.streamQuota) {
      updateData.streamQuota = streamQuota;
      changes.streamQuota = { old: oldUser.streamQuota, new: streamQuota };
    }
    if (isActive !== undefined && isActive !== oldUser.isActive) {
      updateData.isActive = isActive;
      changes.isActive = { old: oldUser.isActive, new: isActive };
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'No changes detected' });
    }

    // Update user
    await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id));

    // Log activity
    if (changes.role) {
      // Special log for role changes
      await logRoleChange(
        id,
        updateData.name || oldUser.name,
        updateData.email || oldUser.email,
        changes.role.old,
        changes.role.new
      );
    }

    // Log general user edit
    await logUserEdit(
      id,
      updateData.name || oldUser.name,
      updateData.email || oldUser.email,
      changes
    );

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

    // Get user data for logging
    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete: mark as inactive
    await db
      .update(user)
      .set({ isActive: false })
      .where(eq(user.id, id));

    // Log activity
    await logUserDelete(
      id,
      targetUser.name,
      targetUser.email
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
