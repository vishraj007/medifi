// app/api/patient/logout/route.ts

import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('patient_token')
  return response
}