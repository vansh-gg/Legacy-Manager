import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { PublicLayout } from './components/PublicLayout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';
import NotFound from './pages/NotFound.jsx';
import CheckInLink from './pages/CheckInLink.jsx';
import Invite from './pages/Invite.jsx';
import Mailbox from './pages/Mailbox.jsx';
import Home from './pages/app/Home.jsx';
import Assets from './pages/app/Assets.jsx';
import AssetForm from './pages/app/AssetForm.jsx';
import Nominees from './pages/app/Nominees.jsx';
import NomineeForm from './pages/app/NomineeForm.jsx';
import Documents from './pages/app/Documents.jsx';
import Letters from './pages/app/Letters.jsx';
import LetterForm from './pages/app/LetterForm.jsx';
import Shared from './pages/app/Shared.jsx';
import SharedVault from './pages/app/SharedVault.jsx';
import Activity from './pages/app/Activity.jsx';
import Settings from './pages/app/Settings.jsx';

/** Move focus and scroll to the top on every page change (helps screen readers). */
function useFocusOnNavigate() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
}

export default function App() {
  useFocusOnNavigate();
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route path="check-in/:token" element={<CheckInLink />} />
        <Route path="invite/:token" element={<Invite />} />
        <Route path="dev/mailbox" element={<Mailbox />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Home />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/new" element={<AssetForm />} />
        <Route path="assets/:id/edit" element={<AssetForm />} />
        <Route path="nominees" element={<Nominees />} />
        <Route path="nominees/new" element={<NomineeForm />} />
        <Route path="nominees/:id/edit" element={<NomineeForm />} />
        <Route path="documents" element={<Documents />} />
        <Route path="letters" element={<Letters />} />
        <Route path="letters/new" element={<LetterForm />} />
        <Route path="letters/:id/edit" element={<LetterForm />} />
        <Route path="shared" element={<Shared />} />
        <Route path="shared/:nomineeId" element={<SharedVault />} />
        <Route path="activity" element={<Activity />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
