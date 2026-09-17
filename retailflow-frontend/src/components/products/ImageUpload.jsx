import { useState, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

// Uploads straight to Cloudinary via POST /api/upload/image and hands the
// resulting URL back through onChange. Parent owns the value (so it can be
// included in the product create/update payload) — this component only
// handles the upload mechanics + preview.
export default function ImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)
    try {
      // No explicit Content-Type here — axios sets the multipart boundary
      // itself when given a FormData body; forcing the header breaks it.
      const res = await api.post('/upload/image', formData)
      onChange(res.data.data.url)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Product Image</label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          {uploading ? (
            <Loader2 size={20} className="text-slate-400 animate-spin"/>
          ) : value ? (
            <img src={value} alt="Product" className="w-full h-full object-cover"/>
          ) : (
            <Camera size={20} className="text-slate-300"/>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="btn-secondary text-xs">
            {value ? 'Change' : 'Upload'}
          </button>
          {value && !uploading && (
            <button type="button" onClick={() => onChange(null)} className="btn-ghost text-xs text-red-500">
              <X size={12}/> Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handleFile} className="hidden"/>
      </div>
    </div>
  )
}
