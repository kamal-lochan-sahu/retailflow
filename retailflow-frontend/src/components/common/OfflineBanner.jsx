import { useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { subscribe, getSnapshot, initOfflineSync, syncQueue } from '../../services/offlineSync.js'

// Status strip shown at the top of every authenticated page:
//   offline            -> reassures the cashier billing still works
//   online + queued    -> "N offline sales syncing"
//   rejected sales     -> loud, with the reason — these never auto-discard
export default function OfflineBanner() {
  const { online, pending, failed, syncing } = useSyncExternalStore(subscribe, getSnapshot)
  const qc = useQueryClient()

  useEffect(() => {
    initOfflineSync()
    const refetch = () => qc.invalidateQueries()
    window.addEventListener('retailflow:synced', refetch)
    return () => window.removeEventListener('retailflow:synced', refetch)
  }, [qc])

  if (!online) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
        <WifiOff size={18} className="mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">You're offline</p>
          <p className="text-xs mt-0.5">
            Billing still works — sales are saved on this device and sync automatically when the connection is back.
            {pending > 0 && <> <strong>{pending}</strong> waiting to sync.</>}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {pending > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-brand-800">
          <RefreshCw size={16} className={`shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          <p className="flex-1 text-sm">
            {syncing ? 'Syncing' : 'Waiting to sync'} <strong>{pending}</strong> offline sale{pending > 1 ? 's' : ''}…
          </p>
          {!syncing && <button onClick={() => syncQueue()} className="btn-secondary text-xs py-1.5">Sync now</button>}
        </div>
      )}
      {failed.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="flex-1 text-sm font-semibold">
              {failed.length} offline sale{failed.length > 1 ? 's' : ''} couldn't be saved to the server
            </p>
            <button onClick={() => syncQueue({ retryFailed: true })} className="btn-secondary text-xs py-1.5">Retry</button>
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {failed.slice(0, 5).map(f => (
              <li key={f.clientId}><span className="font-mono">{f.ref}</span> · ₹{f.total} — {f.error}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">These stay on this device until resolved — note them down before clearing browser data.</p>
        </div>
      )}
    </>
  )
}
