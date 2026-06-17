import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '../../store/uiStore.js'
import { useAuthStore } from '../../store/authStore.js'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Receipt,
  ShoppingBag, Truck, UserCheck, Wallet, BarChart3,
  Settings, ChevronLeft, ChevronRight, AlertTriangle, Globe, CreditCard
} from 'lucide-react'

const NAV = [
  { to:'/',          icon: LayoutDashboard, label:'Dashboard'   },
  { to:'/pos',       icon: ShoppingCart,    label:'POS / Billing', highlight: true },
  { to:'/products',  icon: Package,         label:'Products'    },
  { to:'/customers', icon: Users,           label:'Customers'   },
  { to:'/udhaar',    icon: CreditCard,      label:'Udhaar'      },
  { to:'/sales',     icon: Receipt,         label:'Sales'       },
  { to:'/purchases', icon: ShoppingBag,     label:'Purchases'   },
  { to:'/suppliers', icon: Truck,           label:'Suppliers'   },
  { to:'/staff',     icon: UserCheck,       label:'Staff'       },
  { to:'/expenses',  icon: Wallet,          label:'Expenses'    },
  { to:'/orders',    icon: Globe,           label:'Online Orders'},
  { to:'/analytics', icon: BarChart3,       label:'Analytics'   },
  { to:'/settings',  icon: Settings,        label:'Settings'    },
]

export default function Sidebar() {
  const open       = useUIStore(s => s.sidebarOpen)
  const toggle     = useUIStore(s => s.toggleSidebar)
  const shopName   = useAuthStore(s => s.getShopName())
  const location   = useLocation()

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-100 shadow-sm z-30 transition-all duration-200 flex flex-col ${open ? 'w-64' : 'w-16'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          RF
        </div>
        {open && <span className="font-semibold text-slate-800 truncate text-sm">{shopName}</span>}
        <button onClick={toggle} className="ml-auto text-slate-400 hover:text-slate-600">
          {open ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, highlight }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
          return (
            <Link key={to} to={to}
              className={`sidebar-link ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'} ${highlight && !active ? 'border border-brand-200 bg-brand-50 text-brand-700' : ''}`}
              title={!open ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0"/>
              {open && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
