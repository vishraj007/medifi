// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog } from '@/lib/middleware/audit'

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')

    if (userId) {
      await createAuditLog({
        userId,
        action: 'LOGOUT'
      })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth_token')

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}