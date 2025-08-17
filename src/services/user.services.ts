// services/user.services.ts
import prisma from '../config/prisma'
import { UserRole } from '@prisma/client'

export const getUserById = async (userId: number) => {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, role: true, createdAt: true },
    })
  } catch {
    throw new Error('get user failed')
  }
}

// If you specifically want students:
export const getStudentById = async (userId: number) => {
  try {
    return await prisma.user.findFirst({
      where: { id: userId, role: UserRole.STUDENT },
      select: { id: true, email: true, username: true, role: true },
    })
  } catch {
    throw new Error('get student failed')
  }
}
