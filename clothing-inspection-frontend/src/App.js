import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClothesList from './pages/ClothesList';
import InspectionList from './pages/InspectionList';
import InspectionDetail from './pages/InspectionDetail';
import ChangePassword from './pages/ChangePassword';
import UserManagement from './pages/UserManagement';
import ProductManagement from './pages/ProductManagement';
import CompanyManagement from './pages/CompanyManagement';
import Layout from './components/Layout';
import 'bootstrap/dist/css/bootstrap.min.css';
import { SnackbarProvider } from 'notistack';
import InspectionRegisterPage from './pages/InspectionRegisterPage';
import WorkerInspectionList from './pages/WorkerInspectionList';
import BarcodeScanPage from './pages/BarcodeScanPage';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerBarcodeScan from './pages/WorkerBarcodeScan';
import WorkerWorkHistory from './pages/WorkerWorkHistory';
import WorkersStats from './pages/WorkersStats';
import { ListAlt, QrCodeScanner, RestartAlt } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import axios from 'axios';
import DefectList from './pages/DefectList';
import ErrorBoundary from './components/ErrorBoundary';
import TvDashboard from './pages/TvDashboard';

// 관리자 권한 확인 컴포넌트
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = (user.role || '').toLowerCase();
  return role === 'admin' ? children : <Navigate to="/dashboard" />;
};

// Protected route for workers & inspectors (access: 'worker', 'inspector', 'admin')
const WorkerRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = (user.role || '').toLowerCase();
  return user && (['worker','inspector','admin'].includes(role)) ? children : <Navigate to="/login" />;
};

// Route accessible to admin or inspector
const AdminOrInspectorRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = (user.role || '').toLowerCase();
  return user && (role==='admin' || role==='inspector') ? children : <Navigate to="/dashboard" />;
};

const DisplayRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user && (user.role==='display') ? children : <Navigate to="/login" />;
};

function App() {
  const token = localStorage.getItem('token');
  const api = axios.create({
    baseURL: '/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  return (
    <AuthProvider>
      <SnackbarProvider maxSnack={3}>
        <ErrorBoundary>
          <Router>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
              <Route
                path="/clothes"
                element={
                  <Layout>
                    <ClothesList />
                  </Layout>
                }
              />
              <Route
                path="/inspections"
                element={
                  <Layout>
                    <InspectionList />
                  </Layout>
                }
              />
              <Route
                path="/inspections/:id"
                element={
                  <Layout>
                    <InspectionDetail />
                  </Layout>
                }
              />
              <Route
                path="/change-password"
                element={
                  <Layout>
                    <ChangePassword />
                  </Layout>
                }
              />
              <Route
                path="/users"
                element={
                  <Layout>
                    <AdminRoute>
                      <UserManagement />
                    </AdminRoute>
                  </Layout>
                }
              />
              <Route
                path="/products"
                element={
                  <Layout>
                    <ProductManagement />
                  </Layout>
                }
              />
              <Route
                path="/company"
                element={
                  <Layout>
                    <CompanyManagement />
                  </Layout>
                }
              />
              <Route
                path="/inspections/register"
                element={
                  <Layout>
                    <InspectionRegisterPage />
                  </Layout>
                }
              />
              <Route
                path="/worker/inspections"
                element={
                  <WorkerRoute>
                    <Layout>
                      <WorkerInspectionList />
                    </Layout>
                  </WorkerRoute>
                }
              />
              <Route
                path="/worker/scan"
                element={
                  <WorkerRoute>
                    <Layout>
                      <WorkerBarcodeScan />
                    </Layout>
                  </WorkerRoute>
                }
              />
              <Route
                path="/worker/dashboard"
                element={
                  <WorkerRoute>
                    <Layout>
                      <WorkerDashboard />
                    </Layout>
                  </WorkerRoute>
                }
              />
              <Route
                path="/worker/history"
                element={
                  <WorkerRoute>
                    <Layout>
                      <WorkerWorkHistory />
                    </Layout>
                  </WorkerRoute>
                }
              />
              <Route
                path="/workers/stats"
                element={
                  <Layout>
                    <AdminOrInspectorRoute>
                      <WorkersStats />
                    </AdminOrInspectorRoute>
                  </Layout>
                }
              />
              <Route
                path="/defects"
                element={
                  <Layout>
                    <DefectList />
                  </Layout>
                }
              />
              <Route
                path="/tv/dashboard"
                element={
                  <DisplayRoute>
                    <TvDashboard />
                  </DisplayRoute>
                }
              />
            </Routes>
          </Router>
        </ErrorBoundary>
      </SnackbarProvider>
    </AuthProvider>
  );
}

export default App;
