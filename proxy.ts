// proxy.ts
// Protects patient and doctor/admin routes.
// Uses 'jose' instead of 'jsonwebtoken' because proxy runs in Edge Runtime.

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

const PROTECTED_DOCTOR_ROUTES = ['/session', '/person-lookup', '/admin', '/domain-select']
const PROTECTED_PATIENT_ROUTES = ['/patient/dashboard']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (PROTECTED_PATIENT_ROUTES.some(r => pathname.startsWith(r))) {
    const token = req.cookies.get('patient_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/patient', req.url))
    }
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if (payload.role !== 'PATIENT') throw new Error('Not patient')
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL('/patient', req.url))
      response.cookies.delete('patient_token')
      return response
    }
  }

  if (PROTECTED_DOCTOR_ROUTES.some(r => pathname.startsWith(r))) {
    const token = req.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      await jwtVerify(token, SECRET)
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL('/login', req.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  paths: [
    '/session/:path*',
    '/person-lookup/:path*',
    '/admin/:path*',
    '/domain-select',
    '/domain-select/:path*',
    '/patient/dashboard',
    '/patient/dashboard/:path*',
  ]
}