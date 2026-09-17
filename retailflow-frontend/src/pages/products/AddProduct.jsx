import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createProduct, updateProduct } from '../../services/product.service.js'
import { useQueryClient } from '@tanstack/react-query'
import ImageUpload from '../../components/products/ImageUpload.jsx'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'

const UNITS    = ['piece','kg','gram','litre','ml','dozen','box','packet']
const GST_SLABS= [0,5,12,18,28]

export default function AddProduct() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [imageUrl, setImageUrl] = useState(null)
  const { register, handleSubmit, formState:{ isSubmitting, errors } } = useForm({
    defaultValues: { unit:'piece', gstPercent:0, stock:0, minStock:5, mrp:0 }
  })

  const onSubmit = async (data) => {
    try {
      // images isn't in createProductSchema (Joi strips unknown fields on
      // POST), so create first, then attach the uploaded URL with a PUT —
      // that route has no such stripping.
      const res = await createProduct({
        ...data,
        mrp:           parseFloat(data.mrp)||0,
        sellingPrice:  parseFloat(data.sellingPrice),
        purchasePrice: parseFloat(data.purchasePrice)||0,
        stock:         parseInt(data.stock)||0,
        minStock:      parseInt(data.minStock)||5,
        gstPercent:    parseFloat(data.gstPercent)||0,
      })
      const newId = res?.data?.data?._id
      if (imageUrl && newId) {
        await updateProduct(newId, { images: [imageUrl] })
      }
      toast.success('Product added!')
      qc.invalidateQueries(['products'])
      navigate('/products')
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to add product')
    }
  }

  const Field = ({ label, name, type='text', required=false, options=null, placeholder='' }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      {options
        ? <select {...register(name)} className="input text-sm">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input {...register(name,{required})} type={type} placeholder={placeholder} className="input text-sm"/>
      }
      {errors[name] && <p className="text-red-500 text-xs mt-1">Required</p>}
    </div>
  )

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/products')} className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-bold text-slate-800">Add Product</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Basic Information</h2>
          <ImageUpload value={imageUrl} onChange={setImageUrl}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product Name" name="name" required placeholder="e.g. Basmati Rice 5kg"/>
            <Field label="Brand" name="brand" placeholder="e.g. India Gate"/>
            <Field label="SKU" name="sku" placeholder="e.g. RICE-001"/>
            <Field label="Barcode" name="barcode" placeholder="e.g. 8901234567890"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea {...register('description')} rows={2} className="input text-sm resize-none" placeholder="Optional description"/>
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Pricing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Selling Price ₹" name="sellingPrice" type="number" required placeholder="0"/>
            <Field label="MRP ₹"           name="mrp"          type="number" placeholder="0"/>
            <Field label="Purchase Price ₹"name="purchasePrice"type="number" placeholder="0"/>
          </div>
        </div>

        {/* Stock */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Stock & Unit</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Opening Stock" name="stock"    type="number" placeholder="0"/>
            <Field label="Min Stock"     name="minStock" type="number" placeholder="5"/>
            <Field label="Unit"          name="unit"     options={UNITS}/>
            <Field label="GST %"         name="gstPercent" options={GST_SLABS}/>
          </div>
          <Field label="HSN Code" name="hsnCode" placeholder="e.g. 1006"/>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={()=>navigate('/products')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            <Save size={16}/>{isSubmitting ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
