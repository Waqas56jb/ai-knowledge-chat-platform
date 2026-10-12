import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { applyAppearance } from './services/settingsService';
import './styles/index.css';
import { installChunkReload } from './utils/chunkReload';

installChunkReload();

applyAppearance();
// keep "system" theme in sync with the OS
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyAppearance());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>
);
