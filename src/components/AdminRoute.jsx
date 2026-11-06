import { Navigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth.js'

// Halaman khusus admin. Catatan: ini hanya pembatas tampilan,
// keamanan sebenarnya harus dicek lagi di backend.
export default function AdminRoute({ children }) {
  return isAdmin() ? children : <Navigate to="/dashboard" replace />
}
