import { getCurrentUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { MainLayoutClient } from './main-layout-client'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const uid = await getCurrentUserId()
  if (!uid) redirect('/login')
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, username: true, avatar: true, profile: true } })
  return <MainLayoutClient user={user}>{children}</MainLayoutClient>
}
