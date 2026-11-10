import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthShell from './AuthShell.jsx'
import { resetPassword } from '../../services/auth.service.js'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate  = useNavigate()
  const [expired, setExpired] = useState(false)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ password }) => {
    try {
      await resetPassword(token, password)
      toast.success('Password updated. Please sign in.')
      navigate('/login', { replace: true })
    } catch (e) {
      const msg = e.response?.data?.message || 'Could not reset password'
      if (e.response?.status === 400 && /expired|invalid/i.test(msg)) setExpired(true)
      else toast.error(msg)
    }
  }

  if (expired) {
    return (
      <AuthShell title="Link expired">
        <p className="text-sm text-slate-600 mb-4">This reset link is invalid or has expired (links work once, for 1 hour).</p>
        <Link to="/forgot-password" className="btn-primary inline-block px-5 py-2">Request a new link</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
          <input {...register('password', { required: 'Enter a new password', minLength: { value: 8, message: 'At least 8 characters' }, maxLength: { value: 72, message: 'At most 72 characters' } })}
                 type="password" className="input" autoComplete="new-password"/>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
          <input {...register('confirm', { required: 'Confirm the new password', validate: v => v === watch('password') || 'Passwords do not match' })}
                 type="password" className="input" autoComplete="new-password"/>
          {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
          {isSubmitting ? 'Saving...' : 'Update password'}
        </button>
        <p className="text-xs text-slate-500">You will be signed out on all devices.</p>
      </form>
    </AuthShell>
  )
}
