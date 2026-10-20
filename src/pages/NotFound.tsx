import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That tool does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline underline-offset-4">
        Back to dashboard
      </Link>
    </div>
  )
}
