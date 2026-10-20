import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { SessionProvider } from './state/session';
import { MeProvider } from './state/me';
import { ToastProvider } from './components/Toast';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <MeProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </MeProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
