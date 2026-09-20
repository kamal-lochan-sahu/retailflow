import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { fetchStaff, createStaff, updateStaff, deleteStaff } from '../../services/staff.service.js'
import Modal from '../../components/common/Modal.jsx'
import { PageLoader } from '../../components/common/Loader.jsx'
import { formatINR, formatDate } from '../../utils/formatCurrency.js'
import { Plus, UserCheck, Edit, Ban, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES      = ['manager','cashier','stockboy','delivery']
const SALARY_TYPES = ['monthly','daily','hourly']

function AddStaffModal({ open, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState:{ isSubmitting, errors } } = useForm({
    defaultValues: { role:'cashier', salaryType:'monthly' }
  })

  const mutation = useMutation({
    mutationFn: createStaff,
    onSuccess: () => {
      toast.success('Staff added!')
      qc.invalidateQueries(['staff'])
      reset()
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add staff')
  })

  const onSubmit = (data) => {
    mutation.mutate({
      name: data.name, email: data.email, phone: data.phone, password: data.password, role: data.role,
      designation: data.designation,
      salary: { amount: parseFloat(data.salaryAmount) || 0, type: data.salaryType },
      joiningDate: data.joiningDate || undefined,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Staff" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input {...register('name',{required:true})} className="input text-sm" placeholder="Full name"/>
          {errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input {...register('email',{required:true})} type="email" className="input text-sm" placeholder="login email"/>
            {errors.email && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input {...register('phone')} className="input text-sm" placeholder="Mobile"/>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
          <input {...register('password',{required:true, minLength:6})} type="password" className="input text-sm" placeholder="Set a login password"/>
          <p className="text-xs text-slate-400 mt-1">Share this with them directly — there's no invite email yet.</p>
          {errors.password && <p className="text-red-500 text-xs mt-1">At least 6 characters</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
            <select {...register('role',{required:true})} className="input text-sm">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
            <input {...register('designation')} className="input text-sm" placeholder="e.g. Floor staff"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salary ₹</label>
            <input {...register('salaryAmount')} type="number" className="input text-sm" placeholder="0"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salary type</label>
            <select {...register('salaryType')} className="input text-sm">
              {SALARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date</label>
          <input {...register('joiningDate')} type="date" className="input text-sm"
            defaultValue={new Date().toISOString().split('T')[0]}/>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
            {isSubmitting ? 'Adding...' : 'Add Staff'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditStaffModal({ staff, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({
    values: staff ? {
      name: staff.userId?.name || '',
      phone: staff.userId?.phone || '',
      role: staff.userId?.role || 'cashier',
      designation: staff.designation || '',
      salaryAmount: staff.salary?.amount || 0,
      salaryType: staff.salary?.type || 'monthly',
    } : {}
  })

  const mutation = useMutation({
    mutationFn: (data) => updateStaff(staff._id, data),
    onSuccess: () => { toast.success('Staff updated!'); qc.invalidateQueries(['staff']); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update staff')
  })

  const onSubmit = (data) => {
    mutation.mutate({
      name: data.name, phone: data.phone, role: data.role, designation: data.designation,
      salary: { amount: parseFloat(data.salaryAmount) || 0, type: data.salaryType },
    })
  }

  return (
    <Modal open={!!staff} onClose={onClose} title="Edit Staff" size="sm">
      {staff && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input {...register('name')} className="input text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input {...register('phone')} className="input text-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select {...register('role')} className="input text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
            <input {...register('designation')} className="input text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salary ₹</label>
              <input {...register('salaryAmount')} type="number" className="input text-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salary type</label>
              <select {...register('salaryType')} className="input text-sm">
                {SALARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">Email and password aren't editable here — email is their login id, and password resets go through "Forgot password".</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save Changes</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default function Staff() {
  const [addOpen, setAddOpen] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => updateStaff(id, { isActive }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries(['staff']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update status')
  })

  const remove = useMutation({
    mutationFn: deleteStaff,
    onSuccess: () => { toast.success('Staff removed'); qc.invalidateQueries(['staff']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to remove staff')
  })

  if (isLoading) return <PageLoader/>
  const staff = data?.data?.data || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm"><Plus size={14}/> Add Staff</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50">
            {['Name','Role','Designation','Salary','Joining Date','Status','Actions'].map(h=>(
              <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map(s=>(
              <tr key={s._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{s.userId?.name||'-'}</td>
                <td className="px-4 py-3"><span className="badge-blue capitalize">{s.userId?.role||'-'}</span></td>
                <td className="px-4 py-3 text-slate-500">{s.designation||'-'}</td>
                <td className="px-4 py-3">{formatINR(s.salary?.amount||0)}/{s.salary?.type==='monthly'?'mo':s.salary?.type==='daily'?'day':'hr'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(s.joiningDate)}</td>
                <td className="px-4 py-3"><span className={`badge-${s.userId?.isActive?'green':'red'}`}>{s.userId?.isActive?'Active':'Deactivated'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={()=>setEditStaff(s)} className="btn-ghost p-1.5 text-slate-400 hover:text-brand-600"><Edit size={14}/></button>
                    {s.userId?.isActive ? (
                      <button onClick={()=>toggleActive.mutate({id:s._id, isActive:false})}
                        className="btn-ghost p-1.5 text-slate-400 hover:text-yellow-600" title="Deactivate login"><Ban size={14}/></button>
                    ) : (
                      <button onClick={()=>toggleActive.mutate({id:s._id, isActive:true})}
                        className="btn-ghost p-1.5 text-slate-400 hover:text-green-600" title="Reactivate login"><RotateCcw size={14}/></button>
                    )}
                    <button onClick={()=>remove.mutate(s._id)} className="btn-ghost p-1.5 text-slate-400 hover:text-red-500" title="Remove staff record">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.length===0&&(
          <div className="text-center py-16 text-slate-400">
            <UserCheck size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No staff members yet</p>
          </div>
        )}
      </div>

      <AddStaffModal open={addOpen} onClose={()=>setAddOpen(false)}/>
      <EditStaffModal staff={editStaff} onClose={()=>setEditStaff(null)}/>
    </div>
  )
}
