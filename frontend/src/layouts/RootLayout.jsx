import { Outlet } from 'react-router-dom';

import StreamVideoProvider from '@/providers/StreamClientProvider';

const RootLayout = () => {
  return (
    <main>
      <StreamVideoProvider>
        <Outlet />
      </StreamVideoProvider>
    </main>
  );
};

export default RootLayout;
