import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ClaimVerifierPortal from './components/ClaimVerifierPortal';
import { I18nProvider } from './lib/i18n.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      {new URLSearchParams(window.location.search).has('claimverify') ? <ClaimVerifierPortal /> : <App />}
    </I18nProvider>
  </StrictMode>,
);
