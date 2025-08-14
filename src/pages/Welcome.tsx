import React, { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, LogIn } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import Logo from '../components/Logo';
import PageAdvertisement from '@/components/advertisements/PageAdvertisement';
import { useScrollToTop } from '../hooks/useScrollToTop';

const Welcome: React.FC = () => {
  useScrollToTop();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSearchClick = () => {
    navigate('/welcome-search');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleBackClick = () => {
    navigate('/language');
  };

  return (
    <PageContainer>
      <div className="my-8">
      <div className="w-full flex justify-between items-center mb-6">
        <button
          onClick={handleBackClick}
          className="bg-imei-darker p-2 rounded-full hover:bg-imei-dark transition-colors"
        >
          <ArrowLeft size={20} className="text-imei-cyan" />
        </button>
        <Logo size="lg" className="mb-0" />
        <div className="w-8"></div>
      </div>

      {/* إضافة مكون الإعلانات */}
      <PageAdvertisement pageName="welcome" />

      {/* تعريف احترافي للتطبيق */}
      <div className="mt-8 bg-imei-darker bg-opacity-80 rounded-xl p-6 border border-imei-cyan border-opacity-30 shadow-lg text-white">
        <h1 className="text-2xl md:text-3xl font-bold text-imei-cyan mb-4 flex items-center gap-2">
          <span role="img" aria-label="IMEI">🔷</span> IMEI – الأمان يبدأ من هنا
        </h1>
        <p className="mb-6 text-base md:text-lg leading-relaxed">
          تطبيق IMEI هو منصة ذكية شاملة تم تصميمها لحماية مستخدمي الهواتف من السرقة والاحتيال، مع تقديم أدوات سهلة ومتطورة لفحص، تسجيل، أو الإبلاغ عن الهواتف.
        </p>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-imei-cyan mb-2 flex items-center gap-2">
              <span role="img" aria-label="features">🔹</span> ماذا يقدم لك IMEI؟
            </h2>
            <ul className="list-disc list-inside space-y-1 text-base">
              <li><span role="img" aria-label="search">🔍</span> فحص فوري لأي هاتف عبر رقم IMEI للتأكد من حالته (مفقود – مسروق – آمن)</li>
              <li><span role="img" aria-label="report">📤</span> تقديم بلاغ عن هاتف مفقود أو مسروق مع رفع صورة للمحضر</li>
              <li><span role="img" aria-label="register">🧾</span> تسجيل هاتف مستعمل بأدلة ملكية لحمايتك كمشتري</li>
              <li><span role="img" aria-label="login">🔐</span> تسجيل دخول آمن</li>
              <li><span role="img" aria-label="notification">🛰️</span> نظام إشعارات ذكي عند العثور على الهاتف أو محاولة فتحه</li>
              <li><span role="img" aria-label="ads">🗺️</span> إعلانات مخصصة للمستخدم حسب موقعه الجغرافي</li>
              <li><span role="img" aria-label="languages">🌍</span> دعم متعدد اللغات (العربية، الإنجليزية، الفرنسية، الهندية)</li>
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-imei-cyan mb-2 flex items-center gap-2">
              <span role="img" aria-label="why">🔸</span> لماذا IMEI؟
            </h2>
            <p className="text-base">
              لأنك تستحق تطبيقًا يحمي خصوصيتك، ويمنحك الثقة عند بيع أو شراء أو استخدام هاتف
            </p>
          </div>
        </div>
      </div>
      {/* نهاية التعريف الاحترافي */}

      <div className="mt-8 space-y-4">
        <button
          onClick={handleSearchClick}
          className="w-full bg-imei-cyan hover:bg-imei-cyan/90 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-imei-cyan/20"
        >
          <Search size={18} />
          {t('search_imei')}
        </button>

        <button
          onClick={handleLoginClick}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
        >
          <LogIn size={18} />
          {t('login')}
        </button>
      </div>
      </div>
    </PageContainer>
  );
};

export default Welcome;