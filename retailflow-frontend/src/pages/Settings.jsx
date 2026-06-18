import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import { PageLoader } from '../components/common/Loader.jsx'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore.js'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

export default function Settings() {
  const qc = useQueryClient()
  const { user, setSettings } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => api.get('/settings'),
  })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    const s = data?.data?.data
    if (s) reset({
      shopName:         s.shop?.name    || '',
      shopPhone:        s.shop?.phone   || '',
      shopEmail:        s.shop?.email   || '',
      shopAddress:      s.shop?.address || '',
      shopGstin:        s.shop?.gstin   || '',
      thankYouMessage:  s.billing?.thankYouMessage || 'Thank you for shopping with us! 🙏',
      billPrefix:       s.billing?.prefix    || 'INV',
      footerText:       s.billing?.footerText || '',
      lowStockThreshold: s.stock?.defaultLowStockThreshold || 5,
    })
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (d) => api.put('/settings', {
      shop: {
        name:    d.shopName,
        phone:   d.shopPhone,
        email:   d.shopEmail,
        address: d.shopAddress,
        gstin:   d.shopGstin,
      },
      billing: {
        thankYouMessage: d.thankYouMessage,
        prefix:          d.billPrefix,
        footerText:      d.footerText,
      },
      stock: {
        defaultLowStockThreshold: parseInt(d.lowStockThreshold) || 5,
      }
    }),
    onSuccess: async (res) => {
      // Update settings in auth store so sidebar refreshes
      const newSettings = res.data?.data
      if (newSettings) setSettings(newSettings)

      // Also update user branding in store
      useAuthStore.setState(state => ({
        user: state.user ? {
          ...state.user,
          branding: { ...state.user.branding, shopName: newSettings?.shop?.name }
        } : state.user
      }))

      qc.invalidateQueries(['settings'])
      toast.success('Settings saved!')
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to save')
  })

  if (isLoading) return <PageLoader/>

  const Section = ({ title, children }) => (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-slate-700 border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  )

  const Field = ({ label, name, type = 'text', placeholder = '', required = false }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input {...register(name, { required })} type={type} placeholder={placeholder} className="input text-sm"/>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-5">

        <Section title="🏪 Shop Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Shop Name"  name="shopName"    placeholder="Sharma General Store" required/>
            <Field label="Phone"      name="shopPhone"   placeholder="9876543210"/>
            <Field label="Email"      name="shopEmail"   placeholder="shop@email.com" type="email"/>
            <Field label="GSTIN"      name="shopGstin"   placeholder="22AAAAA0000A1Z5"/>
          </div>
          <Field label="Address" name="shopAddress" placeholder="Full shop address"/>
        </Section>

        <Section title="🧾 Billing">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bill Prefix"          name="billPrefix"         placeholder="INV"/>
            <Field label="Low Stock Threshold"  name="lowStockThreshold"  type="number" placeholder="5"/>
          </div>
          <Field label="Thank You Message" name="thankYouMessage" placeholder="Thank you for shopping!"/>
          <Field label="Bill Footer Text"  name="footerText"      placeholder="Return policy, contact etc."/>
        </Section>

        <button type="submit" disabled={isSubmitting || saveMutation.isPending} className="btn-primary">
          <Save size={16}/> {isSubmitting || saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
