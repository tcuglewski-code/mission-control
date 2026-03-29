import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH: Task updaten (status, result, errorMsg, startedAt, completedAt)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status, result, errorMsg, startedAt, completedAt } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (result !== undefined) updateData.result = result;
    if (errorMsg !== undefined) updateData.errorMsg = errorMsg;
    if (startedAt !== undefined) updateData.startedAt = new Date(startedAt);
    if (completedAt !== undefined) updateData.completedAt = new Date(completedAt);

    const task = await prisma.loopTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating loop task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE: Task löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.loopTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting loop task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
