import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Tenancies from './pages/Tenancies';
import LegalCases from './pages/LegalCases';
import Compliance from './pages/Compliance';
import Inspections from './pages/Inspections';
import Maintenance from './pages/Maintenance';
import SupportTickets from './pages/SupportTickets';
import Documents from './pages/Documents';
import Expenses from './pages/Expenses';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Construction from './pages/Construction';
import Obligations from './pages/Obligations';
import RevenueRecords from './pages/RevenueRecords';
import Handovers from './pages/Handovers';
import PowersOfAttorney from './pages/PowersOfAttorney';
import Escalations from './pages/Escalations';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="tenancies" element={<Tenancies />} />
        <Route path="legal-cases" element={<LegalCases />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="inspections" element={<Inspections />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="support-tickets" element={<SupportTickets />} />
        <Route path="documents" element={<Documents />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="chat" element={<Chat />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="construction" element={<Construction />} />
        <Route path="obligations" element={<Obligations />} />
        <Route path="revenue-records" element={<RevenueRecords />} />
        <Route path="handovers" element={<Handovers />} />
        <Route path="powers-of-attorney" element={<PowersOfAttorney />} />
        <Route path="escalations" element={<Escalations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
