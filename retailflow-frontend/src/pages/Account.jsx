import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore.js'
import { changePassword } from '../services/auth.service.js'

// Every role can reach this page (Settings is owner-only on the server), so staff can
// change the password the owner first gave them.
export default function Account() {
  const user = useAuthStore(s => s.user)
  const [show, setShow] = useState(false)
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password changed. Other devices have been signed out.')
      reset()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not change password')
    }
  }

  const pwField = (name, label, rules) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input {...register(name, rules)} type={show ? 'text' : 'password'} className="input"
             autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'} />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
    </div>
  )

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Account</h1>
        <p className="text-sm text-slate-500">Your login details and password</p>
      </div>

      <div className="card p-5 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <span className="text-slate-500">Name</span><span className="text-slate-800">{user?.name}</span>
        <span className="text-slate-500">Email</span><span className="text-slate-800 break-all">{user?.email}</span>
        <span className="text-slate-500">Role</span><span className="text-slate-800 capitalize">{user?.role}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><KeyRound size={16}/> Change password</h2>
          <button type="button" onClick={() => setShow(s => !s)} className="text-slate-500 text-xs flex items-center gap-1">
            {show ? <EyeOff size={14}/> : <Eye size={14}/>} {show ? 'Hide' : 'Show'}
          </button>
        </div>

        {pwField('currentPassword', 'Current password', { required: 'Enter your current password' })}
        {pwField('newPassword', 'New password', {
          required: 'Enter a new password',
          minLength: { value: 8, message: 'At least 8 characters' },
          maxLength: { value: 72, message: 'At most 72 characters' },
          validate: v => v !== watch('currentPassword') || 'New password must be different',
        })}
        {pwField('confirmPassword', 'Confirm new password', {
          required: 'Confirm the new password',
          validate: v => v === watch('newPassword') || 'Passwords do not match',
        })}

        <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2">
          {isSubmitting ? 'Saving...' : 'Change password'}
        </button>
        <p className="text-xs text-slate-500">You stay signed in here; every other device is signed out.</p>
      </form>
    </div>
  )
}
