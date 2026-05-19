// lib/auth/jwt.ts

import jwt from 'jsonwebtoken'

const SECRET = process.env.NEXTAUTH_SECRET!

export interface TokenPayload {
  userId: string
  role: string
  department?: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload
}