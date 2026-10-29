import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, WifiOff } from 'lucide-react'

// Registers the service worker and surfaces the two moments it needs to
// interrupt the cashier: a new version is built and waiting (don't auto-reload
// mid-sale — let them choose when), and the very first time the app has
// actually cached enough to work with no connection at all.
export default function PWAStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh:  [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for an updated service worker periodically — covers a tab left
      // open for hours/days, which would otherwise never notice a new deploy.
      if (!reg) return
      setInterval(() => { reg.update().catch(() => {}) }, 60 * 60 * 1000)
    },
  })

  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 flex items-start gap-3 shadow-pos">
        <RefreshCw size={18} className="text-brand-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Update available</p>
          <p className="text-xs text-slate-500 mt-0.5">A new version is ready. Reload when you're not mid-sale.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setNeedRefresh(false)} className="btn-secondary text-xs py-1.5">Later</button>
            <button onClick={() => updateServiceWorker(true)} className="btn-primary text-xs py-1.5">Reload now</button>
          </div>
        </div>
      </div>
    )
  }

  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 card p-4 flex items-start gap-3 shadow-pos">
        <WifiOff size={18} className="text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Ready to work offline</p>
          <p className="text-xs text-slate-500 mt-0.5">RetailFlow is installed and cached — billing still works with no connection.</p>
        </div>
        <button onClick={() => setOfflineReady(false)} className="btn-ghost p-1 rounded-lg text-xs shrink-0">Dismiss</button>
      </div>
    )
  }

  return null
}
