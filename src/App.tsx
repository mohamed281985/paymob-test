import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from './lib/supabase';
import { Routes, Route, useNavigate } from "react-router-dom";
import type { PluginListenerHandle } from '@capacitor/core';

import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AdProvider } from "./contexts/AdContext";
import AuthGuard from "./components/AuthGuard";
import { useAdModal } from "./contexts/AdModalContext";
import LoginAdModal from "./components/advertisements/LoginAdModal";
import GuestGuard from "./components/GuestGuard";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SplashScreen from "./pages/SplashScreen";
import LanguageSelect from "./pages/LanguageSelect";
import Welcome from "./pages/Welcome";
import WelcomeSearch from "./pages/WelcomeSearch";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import ReportPhone from "./pages/ReportPhone";
import SearchIMEI from "./pages/SearchIMEI";
import PhoneDetails from "./pages/PhoneDetails";
import PayToUnlock from "./pages/PayToUnlock";
import RegisterPhone from "./pages/RegisterPhone";
import OwnershipTransfer from './pages/OwnershipTransfer';
import TransferHistory from './pages/TransferHistory';
import CreateAdvertisement from './pages/CreateAdvertisement';
import PublishAd from './pages/PublishAd';
import SpecialAd from './pages/SpecialAd';
import MyAds from './pages/MyAds';
import Reset from "./pages/Reset";
import DeepLinkHandler from './DeepLinkHandler';
import ResetRegister from "./pages/ResetRegister"; // إضافة هذا السطر

import BusinessSignup from '@/pages/BusinessSignup';
import BusinessProfileComplete from '@/pages/BusinessProfileComplete';
import BusinessTransfer from '@/pages/BusinessTransfer';
import BusinessTransferBuy from '@/pages/BusinessTransferbuy';
import BusinessTransferSell from '@/pages/BusinessTransfersell';

const queryClient = new QueryClient();

const App = () => {
  const navigate = useNavigate();
  const { adToShow, hideAd } = useAdModal();

  useEffect(() => {
    // إزالة المستمع السابق (لمنع التكرار عند إعادة التحميل)
    let listener: PluginListenerHandle | null = null;
    const setupListener = async () => {
      listener = await CapacitorApp.addListener('appUrlOpen', (event) => {
        const urlStr = event.url;
        if (!urlStr) return;
        let url, hash, params, type, token;
        try {
          url = new URL(urlStr);
          hash = url.hash.replace('#', '');
          params = new URLSearchParams(hash);
          type = params.get('type');
          token = params.get('access_token');
        } catch {
          // fallback القديم إذا لم يكن الرابط يحتوي على hash
          if (urlStr.includes('access_token')) {
            token = urlStr.split('#access_token=')[1]?.split('&')[0];
          }
        }
        // تحقق من النوع
        if (type === 'signup') {
          // توجيه المستخدم إلى صفحة تسجيل الدخول بعد تأكيد الحساب
          // سيقوم AuthGuard بالتحقق من اكتمال الملف وتوجيهه إذا لزم الأمر
          navigate('/login');
          return;
        } else if (type === 'recovery' && token) {
          localStorage.setItem('resetToken', token);
          navigate('/reset');
          return;
        }
        // fallback: إذا كان الرابط myapp://login أو أي رابط login
        if (urlStr.includes('login')) {
          navigate('/login');
          return;
        }
      });
    };
    setupListener();
    // تنظيف المستمع عند إلغاء تثبيت الكمبوننت
    return () => {
      if (listener) listener.remove();
    };
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <AdProvider>
            <TooltipProvider>
              {adToShow && <LoginAdModal ad={adToShow} onClose={hideAd} />}
              <DeepLinkHandler />
              <Toaster />
              <Sonner />
              <Routes>
              <Route path="/" element={<SplashScreen />} />
              <Route path="/index" element={<Index />} />
              <Route path="/language" element={<LanguageSelect />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/welcome-search" element={<WelcomeSearch />} />
              
              <Route 
                path="/login" 
                element={
                  <GuestGuard>
                    <Login />
                  </GuestGuard>
                } 
              />
              
              <Route 
                path="/signup" 
                element={
                  <GuestGuard>
                    <Signup />
                  </GuestGuard>
                } 
              />
              
              <Route 
                path="/forgot-password" 
                element={
                  <GuestGuard>
                    <ForgotPassword />
                  </GuestGuard>
                } 
              />
              
              <Route 
                path="/dashboard" 
                element={
                  <AuthGuard>
                    <Dashboard />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/report" 
                element={
                  <AuthGuard>
                    <ReportPhone />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/search" 
                element={
                  <AuthGuard>
                    <SearchIMEI />
                  </AuthGuard>
                } 
              />
              
              <Route path="/phone/:id" element={<PhoneDetails />} />
              
              <Route 
                path="/pay/:id" 
                element={
                  <AuthGuard>
                    <PayToUnlock />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/register-phone" 
                element={
                  <AuthGuard>
                    <RegisterPhone />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/ownership-transfer" 
                element={
                  <AuthGuard>
                    <OwnershipTransfer />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/transfer-history" 
                element={
                  <AuthGuard>
                    <TransferHistory />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/create-advertisement" 
                element={
                  <AuthGuard>
                    <CreateAdvertisement />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/publish-ad" 
                element={
                  <AuthGuard>
                    <PublishAd />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/special-ad" 
                element={
                  <AuthGuard>
                    <SpecialAd />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/myads" 
                element={
                  <AuthGuard>
                    <MyAds />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/business-signup" 
                element={<BusinessSignup />} 
              />

              <Route 
                path="/businesstransfer" 
                element={
                  <AuthGuard>
                    <BusinessTransfer />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/business-profile-complete" 
                element={
                  <AuthGuard>
                    <BusinessProfileComplete />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/reset" 
                element={
                  <GuestGuard>
                    <Reset />
                  </GuestGuard>
                } 
              />
              <Route 
                path="/reset-register" // إضافة هذا المسار
                element={
                  <AuthGuard>
                    <ResetRegister />
                  </AuthGuard>
                } 
              />
              
              <Route 
                path="/dashboard" 
                element={
                  <AuthGuard>
                    <Dashboard />
                  </AuthGuard>
                } 
              />
              
              <Route path="/BusinessTransferbuy" element={<BusinessTransferBuy />} />
              <Route path="/BusinessTransfersell" element={<BusinessTransferSell />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
          </AdProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
