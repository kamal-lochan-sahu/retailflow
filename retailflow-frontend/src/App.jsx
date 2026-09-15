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

const PrivateRoute = ({ children }) => {
  const token = useAuthStore(s => s.accessToken)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index              element={<Dashboard />} />
        <Route path="pos"         element={<POS />} />
        <Route path="products"    element={<Products />} />
        <Route path="products/add"       element={<AddProduct />} />
        <Route path="products/:id/edit"  element={<EditProduct />} />
        <Route path="products/low-stock" element={<LowStock />} />
        <Route path="products/expiring"  element={<ExpiryAlerts />} />
        <Route path="customers"          element={<Customers />} />
        <Route path="customers/:id"      element={<CustomerDetail />} />
        <Route path="udhaar"             element={<UdhaarMgmt />} />
        <Route path="sales"              element={<Sales />} />
        <Route path="sales/:id"          element={<SaleDetail />} />
        <Route path="purchases"          element={<Purchases />} />
        <Route path="purchases/add"      element={<AddPurchase />} />
        <Route path="suppliers"          element={<Suppliers />} />
        <Route path="staff"              element={<Staff />} />
        <Route path="expenses"           element={<Expenses />} />
        <Route path="analytics"          element={<Analytics />} />
        <Route path="orders"             element={<OnlineOrders />} />
        <Route path="settings"           element={<Settings />} />
      </Route>
    </Routes>
  )
}
