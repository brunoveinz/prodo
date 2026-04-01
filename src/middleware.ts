import { auth } from '@/lib/auth'

export default auth

export const config = {
  matcher: ['/((?!api/auth|login|register|_next|public|favicon).*)'],
}
