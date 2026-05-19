// lib/middleware/audit.ts

import { prisma } from '@/lib/prisma'
import { AuditAction } from '@prisma/client'

interface AuditLogData {
  userId: string
  action: AuditAction
  resource?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(filters?: {
  userId?: string
  action?: AuditAction
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const where: any = {}

  if (filters?.userId) where.userId = filters.userId
  if (filters?.action) where.action = filters.action
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {}
    if (filters.startDate) where.timestamp.gte = filters.startDate
    if (filters.endDate) where.timestamp.lte = filters.endDate
  }

  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: filters?.limit || 50,
    skip: filters?.offset || 0
  })
}

export async function getAuditLogsCount(filters?: {
  userId?: string
  action?: AuditAction
  startDate?: Date
  endDate?: Date
}) {
  const where: any = {}

  if (filters?.userId) where.userId = filters.userId
  if (filters?.action) where.action = filters.action
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {}
    if (filters.startDate) where.timestamp.gte = filters.startDate
    if (filters.endDate) where.timestamp.lte = filters.endDate
  }

  return await prisma.auditLog.count({ where })
}