import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const logActivity = async ({
  userId,
  activity,
}: {
  userId: number;
  activity: string;
}) => {
  try {
   
    const user = await prisma.user.findUnique({ where: { id: userId },  select: { username: true }, });
    if (!user) throw new Error('User not found');

     await prisma.activityLog.create({
      data: {
        userId,
        username: user.username,
        activity,
      },
    });

  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
