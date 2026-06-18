import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import { PageLoader } from '../components/common/Loader.jsx'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

export default function Settings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey:['settings'],
    queryFn: ()=>api.get('/settings'),
  })

  const { register, handleSubmit, reset, formState:{isSubmitting} } = useForm()

  useEffect(()=>{
    const s = data?.data?.data
    if (s) reset({
      'shop.name':           s.shop?.name||'',
      'shop.phone':          s.shop?.phone||'',
      'shop.email':          s.shop?.email||'',
      'shop.address':        s.shop?.address||'',
      'shop.gstin':          s.shop?.gstin||'',
      'billing.thankYouMessage': s.billing?.thankYouMessage||'',
      'billing.prefix':      s.billing?.prefix||'INV',
      'billing.footerText':  s.billing?.footerText||'',
      'stock.defaultLowStockThreshold': s.stock?.defaultLowStockThreshold||5,
    })
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (d)=>api.put('/settings', {
      shop: {
        name:    d['shop.name'],
        phone:   d['shop.phone'],
        email:   d['shop.email'],
        address: d['shop.address'],
        gstin:   d['shop.gstin'],
      },
      billing: {
        thankYouMessage: d['billing.thankYouMessage'],
        prefix:          d['billing.prefix'],
        footerText:      d['billing.footerText'],
      },
      stock: {
        defaultLowStockThreshold: parseInt(d['stock.defaultLowStockThreshold'])||5,
      }
    }),
    onSuccess: ()=>{ toast.success('Settings saved!'); qc.invalidateQueries(['settings']) },
    onError: e=>toast.error(e.response?.data?.message||'Failed')
  })

  if (isLoading) return <PageLoader/>

  const Section = ({title, children}) => (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-slate-700 border-b border-slate-100 pb-2">{title}</h2>
      {children}
    </div>
  )

  const Field = ({label, name, type='text', placeholder=''}) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input {...register(name)} type={type} placeholder={placeholder} className="input text-sm"/>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <form onSubmit={handleSubmit(d=>saveMutation.mutate(d))} className="space-y-5">
        <Section title="Shop Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Shop Name"  name="shop.name"    placeholder="Sharma General Store"/>
            <Field label="Phone"      name="shop.phone"   placeholder="9876543210"/>
            <Field label="Email"      name="shop.email"   placeholder="shop@email.com"/>
            <Field label="GSTIN"      name="shop.gstin"   placeholder="22AAAAA0000A1Z5"/>
          </div>
          <Field label="Address" name="shop.address" placeholder="Full shop address"/>
        </Section>

        <Section title="Billing">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bill Prefix" name="billing.prefix" placeholder="INV"/>
            <Field label="Low Stock Threshold" name="stock.defaultLowStockThreshold" type="number"/>
          </div>
          <Field label="Thank You Message" name="billing.thankYouMessage" placeholder="Thank you for shopping!"/>
          <Field label="Bill Footer Text" name="billing.footerText" placeholder="Return policy, contact etc."/>
        </Section>

        <button type="submit" disabled={isSubmitting} className="btn-primary">
          <Save size={16}/>{isSubmitting?'Saving...':'Save Settings'}
        </button>
      </form>
    </div>
  )
}
