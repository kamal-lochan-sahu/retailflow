import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore.js'
import AppLayout from './components/common/AppLayout.jsx'

// Auth
import Login    from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'

// Main pages
import Dashboard     from './pages/Dashboard.jsx'
import POS           from './pages/pos/POS.jsx'
import Products      from './pages/products/Products.jsx'
import AddProduct    from './pages/products/AddProduct.jsx'
import EditProduct   from './pages/products/EditProduct.jsx'
import Customers     from './pages/customers/Customers.jsx'
import CustomerDetail from './pages/customers/CustomerDetail.jsx'
import UdhaarMgmt    from './pages/customers/UdhaarManagement.jsx'
import Sales         from './pages/sales/Sales.jsx'
import SaleDetail    from './pages/sales/SaleDetail.jsx'
import Purchases     from './pages/purchases/Purchases.jsx'
import AddPurchase   from './pages/purchases/AddPurchase.jsx'
import Suppliers     from './pages/suppliers/Suppliers.jsx'
import Staff         from './pages/staff/Staff.jsx'
import Expenses      from './pages/expenses/Expenses.jsx'
import Analytics     from './pages/analytics/Analytics.jsx'
import Settings      from './pages/Settings.jsx'
import LowStock      from './pages/products/LowStock.jsx'
import ExpiryAlerts  from './pages/products/ExpiryAlerts.jsx'
import OnlineOrders  from './pages/online-orders/OnlineOrders.jsx'
import AuditTrail    from './pages/audit/AuditTrail.jsx'
import GSTR1         from './pages/gst/GSTR1.jsx'
import Account       from './pages/Account.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import ResetPassword  from './pages/auth/ResetPassword.jsx'
import { landingFor, MANAGER_UP, OWNER_ONLY, CASHIER_UP, STOCK_UP } from './utils/roles.js'

const PrivateRoute = ({ children }) => {
  const token = useAuthStore(s => s.accessToken)
  return token ? children : <Navigate to="/login" replace />
}

// Page is rendered only for the listed roles; anyone else is sent to their own landing page.
// (This is UX only — the API enforces the same rule on the server.)
const RoleRoute = ({ roles, children }) => {
  const role = useAuthStore(s => s.user?.role)
  return roles.includes(role) ? children : <Navigate to={landingFor(role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password"        element={<ForgotPassword />} />
      <Route path="/reset-password/:token"  element={<ResetPassword />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index              element={<RoleRoute roles={MANAGER_UP}><Dashboard /></RoleRoute>} />
        <Route path="pos"         element={<RoleRoute roles={CASHIER_UP}><POS /></RoleRoute>} />
        <Route path="products"    element={<RoleRoute roles={STOCK_UP}><Products /></RoleRoute>} />
        <Route path="products/add"       element={<RoleRoute roles={MANAGER_UP}><AddProduct /></RoleRoute>} />
        <Route path="products/:id/edit"  element={<RoleRoute roles={MANAGER_UP}><EditProduct /></RoleRoute>} />
        <Route path="products/low-stock" element={<RoleRoute roles={STOCK_UP}><LowStock /></RoleRoute>} />
        <Route path="products/expiring"  element={<RoleRoute roles={STOCK_UP}><ExpiryAlerts /></RoleRoute>} />
        <Route path="customers"          element={<RoleRoute roles={CASHIER_UP}><Customers /></RoleRoute>} />
        <Route path="customers/:id"      element={<RoleRoute roles={CASHIER_UP}><CustomerDetail /></RoleRoute>} />
        <Route path="udhaar"             element={<RoleRoute roles={CASHIER_UP}><UdhaarMgmt /></RoleRoute>} />
        <Route path="sales"              element={<RoleRoute roles={CASHIER_UP}><Sales /></RoleRoute>} />
        <Route path="sales/:id"          element={<RoleRoute roles={CASHIER_UP}><SaleDetail /></RoleRoute>} />
        <Route path="purchases"          element={<RoleRoute roles={MANAGER_UP}><Purchases /></RoleRoute>} />
        <Route path="purchases/add"      element={<RoleRoute roles={MANAGER_UP}><AddPurchase /></RoleRoute>} />
        <Route path="suppliers"          element={<RoleRoute roles={MANAGER_UP}><Suppliers /></RoleRoute>} />
        <Route path="staff"              element={<RoleRoute roles={MANAGER_UP}><Staff /></RoleRoute>} />
        <Route path="expenses"           element={<RoleRoute roles={MANAGER_UP}><Expenses /></RoleRoute>} />
        <Route path="analytics"          element={<RoleRoute roles={MANAGER_UP}><Analytics /></RoleRoute>} />
        <Route path="orders"             element={<OnlineOrders />} />
        <Route path="audit-trail"        element={<RoleRoute roles={OWNER_ONLY}><AuditTrail /></RoleRoute>} />
        <Route path="gst-returns"        element={<RoleRoute roles={OWNER_ONLY}><GSTR1 /></RoleRoute>} />
        <Route path="settings"           element={<RoleRoute roles={OWNER_ONLY}><Settings /></RoleRoute>} />
        <Route path="account"            element={<Account />} />
      </Route>
    </Routes>
  )
}
