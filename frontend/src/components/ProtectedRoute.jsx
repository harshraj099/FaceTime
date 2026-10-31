import { Navigate, Outlet } from 'react-router-dom';

import { useUser } from '@/context/AuthContext';
import Loader from './Loader';

const ProtectedRoute = () => {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <Loader />;

  if (!user) return <Navigate to="/sign-in" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
