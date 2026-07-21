import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import PasswordResetPage from './pages/PasswordResetPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import {
  CreateReportPage,
  ReportPreviewPage,
  SettingsPage,
  BillingSuccessPage,
  BillingCancelPage
} from './pages/Placeholders'

import './index.css'

const RootRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  return user ? <Navigate to="/projects" replace /> : <Navigate to="/login" replace />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          
          <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
          <Route path="/projects" element={<AuthGuard><ProjectsPage /></AuthGuard>} />
          <Route path="/projects/:id" element={<AuthGuard><ProjectDetailPage /></AuthGuard>} />
          <Route path="/update/:projectId/new" element={<AuthGuard><CreateReportPage /></AuthGuard>} />
          <Route path="/preview/:reportId" element={<AuthGuard><ReportPreviewPage /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
          
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
