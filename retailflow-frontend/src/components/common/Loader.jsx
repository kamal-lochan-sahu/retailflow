export default function Loader({ size = 'md', className = '' }) {
  const s = { sm:'w-4 h-4', md:'w-8 h-8', lg:'w-12 h-12' }[size]
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${s} border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin`}/>
    </div>
  )
}

export function PageLoader() {
  return <div className="flex items-center justify-center h-64"><Loader size="lg"/></div>
}
