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
<<<<<<< HEAD
=======
import FetchTeachers from './pages/FetchTeachers';
>>>>>>> 96a6c55 (added the chages in the unregsiter teacher follow up)
import AcadHrs from './pages/AcadHrs';
import Users from './pages/Users';
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
<<<<<<< HEAD
=======
            <Route
              path="/fetch-teachers"
              element={
                <ProtectedRoute adminOnly>
                  <FetchTeachers />
                </ProtectedRoute>
              }
            />
>>>>>>> 96a6c55 (added the chages in the unregsiter teacher follow up)
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
