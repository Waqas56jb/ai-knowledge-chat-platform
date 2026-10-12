import { useSyncExternalStore } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './hooks/useAuth';
import { BreadcrumbProvider } from './hooks/useBreadcrumbs';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { getAppearance, subscribeAppearance } from './services/settingsService';
import AppRoutes from './routes/AppRoutes';

const appearanceTheme = () => getAppearance().theme;

function ThemedToaster() {
  useSyncExternalStore(subscribeAppearance, appearanceTheme, appearanceTheme); // re-read the theme when it changes
  const dark = document.documentElement.classList.contains('dark');
  return <Toaster position="bottom-right" theme={dark ? 'dark' : 'light'} richColors closeButton toastOptions={{ duration: 3500 }} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <ConfirmProvider>
          <AppRoutes />
          <ThemedToaster />
        </ConfirmProvider>
      </BreadcrumbProvider>
    </AuthProvider>
  );
}
