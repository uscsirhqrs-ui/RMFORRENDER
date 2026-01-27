/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import Header from "./components/header/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalReferencesPage from "./pages/references/GlobalReferencesPage";
import LocalReferencesPage from "./pages/references/LocalReferencesPage";
import ManageGlobalReferencesPage from "./pages/admin/ManageGlobalReferencesPage";
import ManageLocalReferencesPage from "./pages/admin/ManageLocalReferencesPage";

import ReferenceDetailsPage from "./pages/ReferenceDetailsPage";
import VIPReferenceDetailsPage from "./pages/VIPReferenceDetailsPage";
import AuthPage from "./pages/register-login/AuthPage";
import ParichayCallback from "./pages/oauth/ParichayCallback";

import { Routes, Route, Navigate } from "react-router-dom"
import HomePage from "./pages/HomePage";

import ForgotPassword from "./pages/forgot-password/ForgotPassword";
import ResetPassword from "./pages/reset-password/ResetPassword";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import Logout from "./pages/Logout";
import ActivationPage from "./pages/ActivationPage";
import HelpPage from "./pages/HelpPage";
import AuditTrailsPage from "./pages/AuditTrailsPage";
import CreateFormPage from "./pages/data-collection/CreateFormPage";
import SharedFormsPage from "./pages/data-collection/SharedFormsPage";
import SavedTemplatesPage from "./pages/data-collection/SavedTemplatesPage";
import LoginAnnouncement from "./components/LoginAnnouncement";

import { FeatureCodes, SUPERADMIN_ROLE_NAME } from './constants';
import { SettingsProvider } from "./context/SettingsContext";
import { MessageBoxProvider } from "./context/MessageBoxContext";
import SettingsPage from "./pages/SettingsPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import FeaturePermissionsPage from "./pages/FeaturePermissionsPage";

function App() {
  // const onSubmitSuccess=()=>{ // ...

  return (
    <SettingsProvider>
      <MessageBoxProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300 w-full overflow-x-hidden relative">
          <Header />
          <LoginAnnouncement />
          <main id="maincontent" className="w-full grow" >
            {/* Main content goes here and routers etc*/}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/references" element={<Navigate to="/references/local" replace />} />
              {/* Reference Management Routes */}
              <Route path="/references/global" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER]}><GlobalReferencesPage /></ProtectedRoute>} />
              <Route path="/references/local" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER]}><LocalReferencesPage /></ProtectedRoute>} />
              <Route path="/references/vip" element={<ProtectedRoute><div className="p-8 text-center text-gray-500">VIP References - Coming Soon</div></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/references/local" replace />} />
              <Route path="/admin/references" element={<Navigate to="/admin/references/local" replace />} />
              <Route path="/admin/references/global" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES]}><ManageGlobalReferencesPage /></ProtectedRoute>} />
              <Route path="/admin/references/local" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES]}><ManageLocalReferencesPage /></ProtectedRoute>} />

              <Route path="/admin/references/local" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES]}><ManageLocalReferencesPage /></ProtectedRoute>} />

              <Route path="/references/global/:id" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER, FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES]}><ReferenceDetailsPage /></ProtectedRoute>} />
              <Route path="/references/local/:id" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES]}><ReferenceDetailsPage /></ProtectedRoute>} />
              <Route path="/references/vip/:id" element={<ProtectedRoute><VIPReferenceDetailsPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute allowedRoles={['Inter Lab sender', 'Delegated Admin', SUPERADMIN_ROLE_NAME]} requiredPermissions={[FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE, FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES]}><UsersPage /></ProtectedRoute>} />
              <Route path="/audit-trails" element={<ProtectedRoute allowedRoles={[SUPERADMIN_ROLE_NAME]} requiredPermissions={[FeatureCodes.FEATURE_AUDIT_TRAILS]}><AuditTrailsPage /></ProtectedRoute>} />
              <Route path="/system-settings" element={<ProtectedRoute allowedRoles={[SUPERADMIN_ROLE_NAME]} requiredPermissions={[FeatureCodes.FEATURE_SYSTEM_CONFIGURATION]}><SystemSettingsPage /></ProtectedRoute>} />
              <Route path="/feature-permissions" element={<ProtectedRoute allowedRoles={[SUPERADMIN_ROLE_NAME]} requiredPermissions={[FeatureCodes.FEATURE_SYSTEM_CONFIGURATION]}><FeaturePermissionsPage /></ProtectedRoute>} />
              <Route path="/data-collection" element={<Navigate to="/data-collection/shared" replace />} />
              <Route path="/data-collection/create" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_FORM_MANAGEMENT]}><CreateFormPage /></ProtectedRoute>} />
              <Route path="/data-collection/shared" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_FORM_MANAGEMENT]}><SharedFormsPage /></ProtectedRoute>} />
              <Route path="/data-collection/saved" element={<ProtectedRoute requiredPermissions={[FeatureCodes.FEATURE_FORM_MANAGEMENT]}><SavedTemplatesPage /></ProtectedRoute>} />
              <Route path="/help" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/oauth/parichay/callback" element={<ParichayCallback />} />
              <Route path="/forgotPassword" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/activate-account" element={<ActivationPage />} />
            </Routes>
          </main>

        </div>
      </MessageBoxProvider>
    </SettingsProvider>
  );
}
export default App;
