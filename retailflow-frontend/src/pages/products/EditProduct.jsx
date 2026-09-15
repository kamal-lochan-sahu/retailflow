import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProduct, updateProduct } from '../../services/product.service.js'
import { fetchCategories } from '../../services/category.service.js'
import { PageLoader } from '../../components/common/Loader.jsx'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'

const UNITS     = ['piece','kg','gram','litre','ml','dozen','box','packet']
const GST_SLABS = [0,5,12,18,28]

export default function EditProduct() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn:  () => fetchProduct(id),
  })
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn:  fetchCategories,
  })

  const product    = data?.data?.data?.product
  const categories = catData?.data?.data || []

  const { register, handleSubmit, reset, formState:{ isSubmitting, errors } } = useForm()

  // Product loads async (separate request from the form mount), so seed the
  // form once it arrives instead of relying on useForm's one-time defaultValues.
  useEffect(() => {
    if (!product) return
    reset({
      name:          product.name || '',
      brand:         product.brand || '',
      sku:           product.sku || '',
      barcode:       product.barcode || '',
      description:   product.description || '',
      category:      product.category?._id || '',
      sellingPrice:  product.sellingPrice ?? 0,
      mrp:           product.mrp ?? 0,
      purchasePrice: product.purchasePrice ?? 0,
      stock:         product.stock ?? 0,
      minStock:      product.minStock ?? 5,
      unit:          product.unit || 'piece',
      gstPercent:    product.gstPercent ?? 0,
      hsnCode:       product.hsnCode || '',
    })
  }, [product, reset])

  const onSubmit = async (data) => {
    try {
      await updateProduct(id, {
        ...data,
        category:      data.category || null,
        mrp:           parseFloat(data.mrp)||0,
        sellingPrice:  parseFloat(data.sellingPrice),
        purchasePrice: parseFloat(data.purchasePrice)||0,
        stock:         parseInt(data.stock)||0,
        minStock:      parseInt(data.minStock)||5,
        gstPercent:    parseFloat(data.gstPercent)||0,
      })
      toast.success('Product updated!')
      qc.invalidateQueries(['products'])
      qc.invalidateQueries(['product', id])
      navigate('/products')
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to update product')
    }
  }

  const Field = ({ label, name, type='text', required=false, options=null, placeholder='' }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required&&<span className="text-red-500 ml-0.5">*</span>}</label>
      {options
        ? <select {...register(name,{required})} className="input text-sm">
            {options.map(o => {
              const val = typeof o === 'object' ? o.value : o
              const lbl = typeof o === 'object' ? o.label : o
              return <option key={val} value={val}>{lbl}</option>
            })}
          </select>
        : <input {...register(name,{required})} type={type} placeholder={placeholder} className="input text-sm"/>
      }
      {errors[name] && <p className="text-red-500 text-xs mt-1">Required</p>}
    </div>
  )

  if (isLoading) return <PageLoader/>

  if (!product) {
    return (
      <div className="max-w-3xl">
        <div className="card p-10 text-center text-slate-400">
          <p>Product not found.</p>
          <Link to="/products" className="btn-primary mt-4 inline-flex text-sm">Back to Products</Link>
        </div>
      </div>
    )
  }

  const categoryOptions = [
    { value:'', label:'— No category —' },
    ...categories.map(c => ({ value:c._id, label:c.name })),
  ]

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/products')} className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></button>
        <h1 className="text-2xl font-bold text-slate-800">Edit Product</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Basic Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product Name" name="name" required placeholder="e.g. Basmati Rice 5kg"/>
            <Field label="Brand" name="brand" placeholder="e.g. India Gate"/>
            <Field label="SKU" name="sku" placeholder="e.g. RICE-001"/>
            <Field label="Barcode" name="barcode" placeholder="e.g. 8901234567890"/>
            <Field label="Category" name="category" options={categoryOptions}/>
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
            <Field label="Stock"     name="stock"    type="number" placeholder="0"/>
            <Field label="Min Stock" name="minStock" type="number" placeholder="5"/>
            <Field label="Unit"      name="unit"     options={UNITS}/>
            <Field label="GST %"     name="gstPercent" options={GST_SLABS}/>
          </div>
          <Field label="HSN Code" name="hsnCode" placeholder="e.g. 1006"/>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={()=>navigate('/products')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            <Save size={16}/>{isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
