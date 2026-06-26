import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { CoursePlayer } from './pages/CoursePlayer';
import { Catalog } from './pages/Catalog';
import { CourseDetails } from './pages/CourseDetails';
import { MyCourses } from './pages/MyCourses';
import { Certifications } from './pages/Certifications';
import { Certificate } from './pages/Certificate';
import { Account } from './pages/Account';
import { Billing } from './pages/Billing';
import { Portfolio } from './pages/Portfolio';
import { Auth } from './pages/Auth';
import { Landing } from './pages/Landing';
import { AuthProvider } from './contexts/AuthContext';
import { CourseProvider } from './contexts/CourseContext';
import { StudioPage } from './pages/Studio';

export default function App() {
  return (
    <AuthProvider>
      <CourseProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/studio/*" element={<StudioPage />} />
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="catalog/:courseId" element={<CourseDetails />} />
              <Route path="my-courses" element={<MyCourses />} />
              <Route path="certifications" element={<Certifications />} />
              <Route path="account" element={<Account />} />
              <Route path="billing" element={<Billing />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="course/:courseId" element={<CoursePlayer />} />
              <Route path="certificate/:courseId" element={<Certificate />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CourseProvider>
    </AuthProvider>
  );
}
