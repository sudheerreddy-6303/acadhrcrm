import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Teachers from './pages/Teachers';
import Tutors from './pages/Tutors';
import Schools from './pages/Schools';
import Tuitions from './pages/Tuitions';
import FollowUpPage from './pages/FollowUpPage';
import Import from './pages/Import';
import ImportAssign from './pages/ImportAssign';
import FetchTutors from './pages/FetchTutors';
import FetchTeachers from './pages/FetchTeachers';
import FetchTuitions from './pages/FetchTuitions';
import FetchSchools from './pages/FetchSchools';
import AcadHrs from './pages/AcadHrs';
import Users from './pages/Users';
import BusinessAssociates from './pages/BusinessAssociates';
import BusinessAssociateFormPage from './pages/BusinessAssociateFormPage';
import WhatsAppMeta from './pages/WhatsAppMeta';
import WhatsAppBulk from './pages/WhatsAppBulk';
import Toast from './components/Toast';

export default function App() {
  return (
    <AuthProvider>
      <Toast />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/tutors" element={<Tutors />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/tuitions" element={<Tuitions />} />
            <Route path="/business-associates" element={<BusinessAssociates />} />
            <Route path="/business-associates/new" element={<BusinessAssociateFormPage />} />
            <Route path="/business-associates/:id/edit" element={<BusinessAssociateFormPage />} />
            <Route path="/whatsapp/meta" element={<WhatsAppMeta />} />
            <Route path="/whatsapp/bulk" element={<WhatsAppBulk />} />
            <Route path="/followup/:type/:id" element={<FollowUpPage />} />
            <Route path="/import" element={<Import />} />
            <Route path="/import-assign" element={<ImportAssign />} />
            <Route
              path="/fetch-tutors"
              element={
                <ProtectedRoute adminOnly>
                  <FetchTutors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fetch-teachers"
              element={
                <ProtectedRoute adminOnly>
                  <FetchTeachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fetch-schools"
              element={
                <ProtectedRoute adminOnly>
                  <FetchSchools />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fetch-tuitions"
              element={
                <ProtectedRoute adminOnly>
                  <FetchTuitions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/acadhrs"
              element={
                <ProtectedRoute adminOnly>
                  <AcadHrs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute adminOnly>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
