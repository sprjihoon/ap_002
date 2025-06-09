import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClothesList from './pages/ClothesList';
import InspectionList from './pages/InspectionList';
import ChangePassword from './pages/ChangePassword';
import UserManagement from './pages/UserManagement';
import ProductManagement from './pages/ProductManagement';
import Layout from './components/Layout';

// 관리자 권한 확인 컴포넌트
const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
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
      </Routes>
    </Router>
  );
}

export default App;
