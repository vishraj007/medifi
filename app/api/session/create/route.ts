import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/middleware/audit'
import { verifyToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  try {
    // ✅ Get token from cookies
    const token = req.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // ✅ Verify token
    let payload
    try {
      payload = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = payload.userId

    // ✅ Get request body
    const { personId, domain, department, language, sessionMode } = await req.json()

    // ✅ Validate required fields
    if (!personId || !domain) {
      return NextResponse.json(
        { error: 'Missing required fields: personId, domain' },
        { status: 400 }
      )
    }

    // ✅ Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ✅ Use user's department if not provided
    const finalDepartment = department || user.department

    if (!finalDepartment) {
      return NextResponse.json(
        { error: 'Department is required' },
        { status: 400 }
      )
    }

    // ✅ Create session
    const session = await prisma.session.create({
      data: {
        personId,
        userId,
        domain,
        department: finalDepartment,
        language: language || 'ENGLISH',
        sessionMode: sessionMode || 'MULTI',
        status: 'ACTIVE'
      },
      include: {
        person: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true
          }
        }
      }
    })

    // ✅ Load config
    const config = await prisma.config.findUnique({
      where: {
        domain_department: {
          domain: session.domain,
          department: session.department
        }
      }
    })

    // ✅ Audit log
    await createAuditLog({
      userId,
      action: 'CREATE_SESSION',
      resource: `Session:${session.id}`,
      details: { domain, department: finalDepartment, personId }
    })

    return NextResponse.json({ 
      ...session, 
      config 
    })

  } catch (error: any) {
    console.error('❌ Session creation error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 500 }
    )
  }
}