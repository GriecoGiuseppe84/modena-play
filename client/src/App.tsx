import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import PublicRoutes from './routes/PublicRoutes';
import AuthRoutes from './routes/AuthRoutes';
import AdminRoutes from './routes/AdminRoutes';
import SplashIntro from "./components/SplashIntro";

export default function App() {
  return (
    <>
      <SplashIntro />
<BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/*" element={<PublicRoutes />} />
            <Route path="/*" element={<AuthRoutes />} />
            <Route path="/*" element={<AdminRoutes />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
    </>
  );
}