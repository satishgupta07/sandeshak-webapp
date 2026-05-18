import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <div className="relative">
        <h1 className="bg-gradient-to-br from-primary to-primary-hover bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
          404
        </h1>
        <p className="mt-2 text-base font-medium text-foreground">Page not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.99]"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
