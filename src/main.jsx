import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initializeNativeAuthBridge } from './lib/nativeAuthBridge';
import './index.css';

const rootElement = document.getElementById('root');

const renderApp = async () => {
  await initializeNativeAuthBridge();

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

void renderApp();
