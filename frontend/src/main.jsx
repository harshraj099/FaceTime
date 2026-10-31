import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@stream-io/video-react-sdk/dist/css/styles.css';
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
