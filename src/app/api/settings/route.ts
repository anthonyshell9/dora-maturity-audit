import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resetAnthropicClient } from '@/lib/ai/anthropic';

// Get all settings (masks sensitive values)
export async function GET() {
  try {
    const settings = await prisma.settings.findMany();

    // Mask sensitive values
    const maskedSettings = settings.map(setting => {
      if (setting.key.includes('api_key') || setting.key.includes('secret')) {
        return {
          ...setting,
          value: setting.value ? '********' + setting.value.slice(-4) : '',
          isSet: !!setting.value,
        };
      }
      return setting;
    });

    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Update or create a setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    // Validate API key format if it's an Anthropic key
    if (key === 'anthropic_api_key' && value) {
      if (!value.startsWith('sk-ant-')) {
        return NextResponse.json(
          { error: 'Invalid Anthropic API key format. It should start with sk-ant-' },
          { status: 400 }
        );
      }
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' },
    });

    // Reset the Anthropic client if the API key was updated
    if (key === 'anthropic_api_key') {
      await resetAnthropicClient();
    }

    // Log the action (without the actual value for sensitive keys)
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SETTING',
        resource: 'Settings',
        resourceId: key,
        details: {
          key,
          valueUpdated: true,
        },
      },
    });

    // Return masked value for sensitive keys
    const isSensitive = key.includes('api_key') || key.includes('secret');
    return NextResponse.json({
      ...setting,
      value: isSensitive && setting.value ? '********' + setting.value.slice(-4) : setting.value,
      isSet: !!setting.value,
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    );
  }
}

// Delete a setting
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    await prisma.settings.delete({
      where: { key },
    });

    // Reset the Anthropic client if the API key was deleted
    if (key === 'anthropic_api_key') {
      await resetAnthropicClient();
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_SETTING',
        resource: 'Settings',
        resourceId: key,
        details: { key },
      },
    });

    return NextResponse.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete setting' },
      { status: 500 }
    );
  }
}
