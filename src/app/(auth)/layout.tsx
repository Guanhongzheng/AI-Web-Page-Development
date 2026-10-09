export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.3),transparent_50%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.25),transparent_50%)]" />
      {children}
    </div>
  )
}
