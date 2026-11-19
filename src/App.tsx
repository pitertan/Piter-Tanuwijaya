/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PortfolioProvider } from './context/PortfolioContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import {
  getRouterBasename,
  isAdminPath,
  resolveHashAdminRedirect,
} from './lib/routing';
import { AdminPage } from './pages/AdminPage';
import { PortfolioPage } from './pages/PortfolioPage';

function RouterEnhancements() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hashTarget = resolveHashAdminRedirect(location.hash);
    if (hashTarget) {
      navigate(hashTarget, { replace: true });
    }
  }, [location.hash, navigate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isAdminPath(location.pathname)) {
          navigate('/admin');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  const routerBasename = getRouterBasename(
    import.meta.env.BASE_URL,
    typeof window !== 'undefined' ? window.location.pathname : '/',
    typeof window !== 'undefined' ? window.location.hostname : ''
  );

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <PortfolioProvider>
            <BrowserRouter basename={routerBasename}>
              <RouterEnhancements />
              <Routes>
                <Route path="/" element={<PortfolioPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/*" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </PortfolioProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
