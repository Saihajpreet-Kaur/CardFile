import { Navigate, Route, Routes } from 'react-router-dom';
import { Backdrop } from './components/Brand';
import Layout from './components/Layout';
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/RouteGuards';
import { usePointerFx } from './hooks/usePointerFx';
import Admin from './pages/Admin';
import { SignIn, SignUp } from './pages/AuthPages';
import ContactDetail from './pages/ContactDetail';
import Contacts from './pages/Contacts';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import Import from './pages/Import';
import Lists from './pages/Lists';
import NotFound from './pages/NotFound';
import Trash from './pages/Trash';

export default function App() {
  usePointerFx();

  return (
    <>
      <Backdrop />
      <Routes>
        {/* Public pages - signed-in users are sent to the dashboard */}
        <Route element={<GuestRoute />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>

        {/* Protected pages share the Layout (nested routes render in its <Outlet />) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/contacts/:id" element={<ContactDetail />} />
            <Route path="/lists" element={<Lists />} />
            <Route path="/followups" element={<FollowUps />} />
            <Route path="/import" element={<Import />} />
            <Route path="/trash" element={<Trash />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
