import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import RootLayout from './layouts/RootLayout';
import HomeLayout from './layouts/HomeLayout';
import Home from './pages/Home';
import Upcoming from './pages/Upcoming';
import Previous from './pages/Previous';
import Recordings from './pages/Recordings';
import PersonalRoom from './pages/PersonalRoom';
import Meeting from './pages/Meeting';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

const App = () => {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RootLayout />}>
          <Route element={<HomeLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/previous" element={<Previous />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/personal-room" element={<PersonalRoom />} />
          </Route>
          <Route path="/meeting/:id" element={<Meeting />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
