import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RegisterForm from '@/components/register-form'
import { Card } from '@/components/ui/card'

export default async function RegisterPage() {
  const session = await auth()

  if (session) {
    redirect('/')
  }

  return (
    <Card className="p-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            FocusTracker Pro
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create a new account
          </p>
        </div>

        <RegisterForm />

        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </Card>
  )
}
