import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { GroupDetailPage } from './pages/GroupDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
