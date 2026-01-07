import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    // Create or get default auditor user
    const user = await prisma.user.upsert({
      where: { email: 'auditor@dora-audit.local' },
      update: {},
      create: {
        id: 'default-auditor',
        email: 'auditor@dora-audit.local',
        name: 'Default Auditor',
        role: 'AUDITOR',
      },
    });

    return NextResponse.json({
      message: 'Default user created/verified',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Error creating default user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: 'default-auditor' },
    });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check user' },
      { status: 500 }
    );
  }
}
