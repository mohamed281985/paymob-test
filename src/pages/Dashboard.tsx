import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/PageContainer';
import AppNavbar from '../components/AppNavbar';
import { Search, Plus, Smartphone } from 'lucide-react';
import { useAdModal } from '../contexts/AdModalContext';
import { Link } from 'react-router-dom';
import { useGeolocated } from 'react-geolocated';
import { supabase } from '../lib/supabase';
import PageAdvertisement from '@/components/advertisements/PageAdvertisement';
import { useScrollToTop } from '../hooks/useScrollToTop';

interface Advertisement {
  id: string;
  image_url: string;
  latitude?: number;
  longitude?: number;
  website_url?: string;
  expires_at: string;
}

// دالة مساعدة لإنشاء رابط صورة محسن باستخدام Supabase Image Transformations
const getTransformedImageUrl = (originalUrl: string, width: number, quality: number = 85) => {
  if (!originalUrl) return '';
  try {
    const url = new URL(originalUrl);
    const newPathname = url.pathname.replace('/storage/v1/object/public/', '/render/image/public/');
    url.pathname = newPathname;
    url.searchParams.set('width', String(width));
    url.searchParams.set('quality', String(quality));
    url.searchParams.set('format', 'webp');
    return url.toString();
  } catch (e) {
    return originalUrl;
  }
};

// دالة مساعدة لتحويل الدرجات إلى راديان
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// بيانات وهمية للهواتف المفقودة في مصر
const mockEgyptPhones = [
  {
    id: 1,
    imei: "123456789012345",
    ownerName: "أحمد محمد",
    phoneType: "iPhone 13 Pro",
    lossDate: "2024-03-15",
    lossLocation: "القاهرة - مدينة نصر",
    status: "active",
    city: "القاهرة"
  },
  {
    id: 2,
    imei: "987654321098765",
    ownerName: "سارة أحمد",
    phoneType: "Samsung Galaxy S22",
    lossDate: "2024-03-14",
    lossLocation: "الإسكندرية - سيدي جابر",
    status: "active",
    city: "الإسكندرية"
  },
  {
    id: 3,
    imei: "456789123456789",
    ownerName: "محمد علي",
    phoneType: "Xiaomi Redmi Note 11",
    lossDate: "2024-03-13",
    lossLocation: "الجيزة - الدقي",
    status: "active",
    city: "الجيزة"
  },
  {
    id: 4,
    imei: "789123456789123",
    ownerName: "فاطمة حسن",
    phoneType: "Huawei P40 Pro",
    lossDate: "2024-03-12",
    lossLocation: "المنصورة - شارع الجمهورية",
    status: "active",
    city: "المنصورة"
  },
  {
    id: 5,
    imei: "321654987321654",
    ownerName: "علي محمود",
    phoneType: "Oppo Reno 7",
    lossDate: "2024-03-11",
    lossLocation: "أسوان - كورنيش النيل",
    status: "active",
    city: "أسوان"
  },
  {
    id: 6,
    imei: "654987321654987",
    ownerName: "مريم سعيد",
    phoneType: "iPhone 12",
    lossDate: "2024-03-10",
    lossLocation: "بورسعيد - شارع فلسطين",
    status: "active",
    city: "بورسعيد"
  },
  {
    id: 7,
    imei: "987321654987321",
    ownerName: "يوسف خالد",
    phoneType: "Samsung Galaxy A52",
    lossDate: "2024-03-09",
    lossLocation: "طنطا - شارع البحر",
    status: "active",
    city: "طنطا"
  },
  {
    id: 8,
    imei: "321987654321987",
    ownerName: "نورا عماد",
    phoneType: "iPhone 11",
    lossDate: "2024-03-08",
    lossLocation: "دمياط - كورنيش النيل",
    status: "active",
    city: "دمياط"
  },
  {
    id: 9,
    imei: "654321987654321",
    ownerName: "خالد وليد",
    phoneType: "Xiaomi Redmi Note 10",
    lossDate: "2024-03-07",
    lossLocation: "الزقازيق - شارع الجمهورية",
    status: "active",
    city: "الزقازيق"
  },
  {
    id: 10,
    imei: "987654321987654",
    ownerName: "سلمى رامي",
    phoneType: "Huawei P30 Pro",
    lossDate: "2024-03-06",
    lossLocation: "المنيا - شارع النيل",
    status: "active",
    city: "المنيا"
  },
  {
    id: 11,
    imei: "123987654321987",
    ownerName: "رامي سامي",
    phoneType: "Samsung Galaxy S21",
    lossDate: "2024-03-05",
    lossLocation: "سوهاج - شارع البحر",
    status: "active",
    city: "سوهاج"
  },
  {
    id: 12,
    imei: "456123987654321",
    ownerName: "نادية فؤاد",
    phoneType: "iPhone XR",
    lossDate: "2024-03-04",
    lossLocation: "قنا - شارع النيل",
    status: "active",
    city: "قنا"
  },
  {
    id: 13,
    imei: "789456123987654",
    ownerName: "فؤاد حمدي",
    phoneType: "Xiaomi Mi 11",
    lossDate: "2024-03-03",
    lossLocation: "الأقصر - كورنيش النيل",
    status: "active",
    city: "الأقصر"
  },
  {
    id: 14,
    imei: "321789456123987",
    ownerName: "حمدي سعد",
    phoneType: "Huawei Mate 40",
    lossDate: "2024-03-02",
    lossLocation: "أسوان - شارع النيل",
    status: "active",
    city: "أسوان"
  },
  {
    id: 15,
    imei: "654321789456123",
    ownerName: "سعد كمال",
    phoneType: "Samsung Galaxy A72",
    lossDate: "2024-03-01",
    lossLocation: "المنصورة - شارع الجمهورية",
    status: "active",
    city: "المنصورة"
  },
  {
    id: 16,
    imei: "987654321789456",
    ownerName: "كمال رضا",
    phoneType: "iPhone SE",
    lossDate: "2024-02-29",
    lossLocation: "طنطا - شارع البحر",
    status: "active",
    city: "طنطا"
  },
  {
    id: 17,
    imei: "123456789987654",
    ownerName: "رضا عماد",
    phoneType: "Xiaomi Redmi 9",
    lossDate: "2024-02-28",
    lossLocation: "دمياط - كورنيش النيل",
    status: "active",
    city: "دمياط"
  },
  {
    id: 18,
    imei: "456789123654987",
    ownerName: "عماد وائل",
    phoneType: "Huawei P20 Pro",
    lossDate: "2024-02-27",
    lossLocation: "الزقازيق - شارع الجمهورية",
    status: "active",
    city: "الزقازيق"
  },
  {
    id: 19,
    imei: "789123456321987",
    ownerName: "وائل هاني",
    phoneType: "Samsung Galaxy A32",
    lossDate: "2024-02-26",
    lossLocation: "المنيا - شارع النيل",
    status: "active",
    city: "المنيا"
  },
  {
    id: 20,
    imei: "321654987987654",
    ownerName: "هاني ماجد",
    phoneType: "iPhone 8",
    lossDate: "2024-02-25",
    lossLocation: "سوهاج - شارع البحر",
    status: "active",
    city: "سوهاج"
  },
  {
    id: 21,
    imei: "654987321321987",
    ownerName: "ماجد عادل",
    phoneType: "Xiaomi Redmi Note 8",
    lossDate: "2024-02-24",
    lossLocation: "قنا - شارع النيل",
    status: "active",
    city: "قنا"
  },
  {
    id: 22,
    imei: "987321654654987",
    ownerName: "عادل ناصر",
    phoneType: "Huawei P10",
    lossDate: "2024-02-23",
    lossLocation: "الأقصر - كورنيش النيل",
    status: "active",
    city: "الأقصر"
  },
  {
    id: 23,
    imei: "321987654987321",
    ownerName: "ناصر طارق",
    phoneType: "Samsung Galaxy A12",
    lossDate: "2024-02-22",
    lossLocation: "أسوان - شارع النيل",
    status: "active",
    city: "أسوان"
  },
  {
    id: 24,
    imei: "654321987321654",
    ownerName: "طارق سامح",
    phoneType: "iPhone 7",
    lossDate: "2024-02-21",
    lossLocation: "المنصورة - شارع الجمهورية",
    status: "active",
    city: "المنصورة"
  },
  {
    id: 25,
    imei: "987654321654321",
    ownerName: "سامح رامي",
    phoneType: "Xiaomi Redmi 7",
    lossDate: "2024-02-20",
    lossLocation: "طنطا - شارع البحر",
    status: "active",
    city: "طنطا"
  },
  {
    id: 26,
    imei: "123987654321654",
    ownerName: "رامي سعيد",
    phoneType: "Huawei P9",
    lossDate: "2024-02-19",
    lossLocation: "دمياط - كورنيش النيل",
    status: "active",
    city: "دمياط"
  },
  {
    id: 27,
    imei: "456123987654321",
    ownerName: "سعيد خالد",
    phoneType: "Samsung Galaxy A02",
    lossDate: "2024-02-18",
    lossLocation: "الزقازيق - شارع الجمهورية",
    status: "active",
    city: "الزقازيق"
  },
  {
    id: 28,
    imei: "789456123987654",
    ownerName: "خالد عماد",
    phoneType: "iPhone 6s",
    lossDate: "2024-02-17",
    lossLocation: "المنيا - شارع النيل",
    status: "active",
    city: "المنيا"
  },
  {
    id: 29,
    imei: "321789456123987",
    ownerName: "عماد وليد",
    phoneType: "Xiaomi Redmi 6",
    lossDate: "2024-02-16",
    lossLocation: "سوهاج - شارع البحر",
    status: "active",
    city: "سوهاج"
  },
  {
    id: 30,
    imei: "654321789456123",
    ownerName: "وليد سامي",
    phoneType: "Huawei P8",
    lossDate: "2024-02-15",
    lossLocation: "قنا - شارع النيل",
    status: "active",
    city: "قنا"
  }
];

// دالة حساب المسافة باستخدام صيغة Haversine
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // المسافة بالكيلومتر
  return d;
}

const START_DATE = new Date('2025-01-01').getTime(); // تاريخ ثابت لبداية العرض

const Dashboard: React.FC = () => {
  useScrollToTop();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // حساب الصور التي يجب عرضها بناءً على الوقت المنقضي من تاريخ البداية
  const getInitialPhones = () => {
    const currentTime = Date.now();
    const intervalDuration = 2000; // 2 ثانية لكل صورة
    const timeSinceStart = currentTime - START_DATE;
    const currentIndex = Math.floor((timeSinceStart / intervalDuration) % mockEgyptPhones.length);
    
    // تدوير المصفوفة للحصول على الترتيب الصحيح
    const rotatedPhones = [...mockEgyptPhones.slice(currentIndex), ...mockEgyptPhones.slice(0, currentIndex)];
    return rotatedPhones.slice(0, 3);
  };

  const [displayedPhones, setDisplayedPhones] = useState(getInitialPhones());
  const { showAd } = useAdModal();
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const { coords } = useGeolocated({
    positionOptions: { enableHighAccuracy: true },
    userDecisionTimeout: 5000,
  });

  // تأثير لتغيير الهواتف المعروضة كل 5 ثواني
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const intervalDuration = 2000; // 2 ثانية لكل صورة
      const timeSinceStart = currentTime - START_DATE;
      const currentIndex = Math.floor((timeSinceStart / intervalDuration) % mockEgyptPhones.length);
      
      // تدوير المصفوفة للحصول على الترتيب الصحيح
      const rotatedPhones = [...mockEgyptPhones.slice(currentIndex), ...mockEgyptPhones.slice(0, currentIndex)];
      setDisplayedPhones(rotatedPhones.slice(0, 3));
    }, 2000); // تحديث كل 2 ثانية

    return () => clearInterval(interval);
  }, []);

  // تأثير جديد لعرض إعلان خاص عشوائي في نافذة منبثقة
  useEffect(() => {
    const adShownKey = `specialAdShown_${user?.id}`;
    const lastShownTime = localStorage.getItem(adShownKey);
    const currentTime = new Date().getTime();

    // دالة لفحص ما إذا كان يجب عرض الإعلان
    const shouldShowAd = () => {
      // إذا لم يتم عرض الإعلان من قبل، اعرضه
      if (!lastShownTime) return true;

      // التحقق من وقت آخر ظهور للإعلان (كل 5 دقائق)
      const timeDiff = currentTime - parseInt(lastShownTime);
      return timeDiff >= 5 * 60 * 1000;
    };

    // دالة معالجة تغيير حالة الصفحة
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldShowAd()) {
        showRandomSpecialAd();
      }
    };

    const showRandomSpecialAd = async () => {
      if (!coords) return; // يتطلب الموقع للعثور على الإعلانات القريبة

      try {
        // جلب الإعلانات الخاصة النشطة من جدول 'special_ad'
        const { data: specialAds, error } = await supabase
          .from('special_ad')
          .select('id, image_url, latitude, longitude, website_url, expires_at')
          .gt('expires_at', new Date().toISOString());

        if (error || !specialAds || specialAds.length === 0) {
          return; // لا توجد إعلانات خاصة نشطة
        }

        // تصفية الإعلانات للعثور على القريبة (مثلاً، في نطاق 3 كم)
        const nearbyAds = specialAds.filter(ad => {
          if (ad.latitude && ad.longitude) {
            const distance = getDistanceFromLatLonInKm(coords.latitude, coords.longitude, ad.latitude, ad.longitude);
            return distance <= 3; // تم تحديد النطاق إلى 3 كم
          }
          return false;
        });

        if (nearbyAds.length > 0) {
          // اختيار إعلان عشوائي من الإعلانات القريبة وعرضه
          const randomAdToShow = nearbyAds[Math.floor(Math.random() * nearbyAds.length)];
          
          // ** التحسين: تحميل الصورة مسبقًا في الخلفية **
          // هذا يجعل الصورة تظهر فورًا عند فتح النافذة المنبثقة
          const optimizedUrl = getTransformedImageUrl(randomAdToShow.image_url, 1024);
          new Image().src = optimizedUrl;

          showAd(randomAdToShow);
          // تخزين وقت آخر ظهور للإعلان
          localStorage.setItem(adShownKey, new Date().getTime().toString());
        }
      } catch (err) {
        console.error("Error fetching or showing special ad:", err);
      }
    };

    // إضافة مستمع لتغيير حالة الصفحة
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // عرض الإعلان عند التحميل الأولي إذا كان مناسباً
    if (shouldShowAd()) {
      const timer = setTimeout(() => {
        showRandomSpecialAd();
      }, 1000); // تأخير 1 ثانية
      return () => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [coords, user, showAd]);

  // تم إزالة useEffect الخاص بالإعلانات العامة

  return (
    <PageContainer>
      <AppNavbar />
      <PageAdvertisement pageName="dashboard" />
      
      <div className="mb-6">
        <h2 className="text-white text-xl font-semibold mb-2">
          {user?.username ? `مرحباً ${user.username}` : t('welcome')}
        </h2>
        
        <div className="grid grid-cols-3 gap-3">
          <Link 
            to="/report" 
            className="bg-imei-darker rounded-xl p-4 border border-imei-cyan border-opacity-20 flex flex-col items-center hover:border-opacity-40 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-imei-dark flex items-center justify-center mb-2">
              <Plus className="text-imei-cyan" size={24} />
            </div>
            <span className="text-white text-sm text-center">{t('report_lost_phone')}</span>
          </Link>
          
          <Link 
            to="/search" 
            className="bg-imei-darker rounded-xl p-4 border border-imei-cyan border-opacity-20 flex flex-col items-center hover:border-opacity-40 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-imei-dark flex items-center justify-center mb-2">
              <Search className="text-imei-cyan" size={24} />
            </div>
            <span className="text-white text-sm text-center">{t('search_imei')}</span>
          </Link>
          
          <Link 
            to="/register-phone" 
            className="bg-imei-darker rounded-xl p-4 border border-imei-cyan border-opacity-20 flex flex-col items-center hover:border-opacity-40 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-imei-dark flex items-center justify-center mb-2">
              <Smartphone className="text-imei-cyan" size={24} />
            </div>
            <span className="text-white text-sm text-center">{t('register_new_phone')}</span>
          </Link>
        </div>
      </div>
      
      <div className="mb-4">
        <h2 className="text-white text-xl font-semibold mb-3">{t('lost_phones')}</h2>
        <div className="grid grid-cols-2 gap-4">
          {displayedPhones.slice(0, 2).map((phone) => (
            <div key={phone.id} className="bg-imei-darker rounded-xl p-4 border border-imei-cyan border-opacity-20 hover:border-opacity-40 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-imei-cyan/10">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-imei-cyan animate-pulse"></div>
                  <span className="text-imei-cyan font-bold tracking-wider">{phone.imei}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-imei-dark flex items-center justify-center">
                    <span className="text-imei-cyan text-sm">👤</span>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs">{t('owner')}</p>
                    <p className="text-white font-medium">{phone.ownerName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-imei-dark flex items-center justify-center">
                    <span className="text-imei-cyan text-sm">📱</span>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs">{t('phone_type')}</p>
                    <p className="text-white font-medium">{phone.phoneType}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-imei-dark flex items-center justify-center">
                    <span className="text-imei-cyan text-sm">📅</span>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs">{t('loss_date')}</p>
                    <p className="text-white font-medium">{new Date(phone.lossDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-imei-dark flex items-center justify-center">
                    <span className="text-imei-cyan text-sm">📍</span>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs">{t('loss_location')}</p>
                    <p className="text-white font-medium">{phone.lossLocation}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-imei-cyan/20">
                <div className="flex justify-between items-center">
                  <span className="text-imei-cyan/80 text-xs">ID: {phone.id}</span>
                  <span className="text-red-500 text-xs bg-red-500/10 px-2 py-1 rounded-full">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* زر إنشاء إعلان تجاري - يظهر فقط للمستخدمين التجاريين */}
      {user?.role === 'business' && (
        <div className="fixed bottom-10 left-6 rtl:right-6 rtl:left-auto">
          <Link 
            to="/create-advertisement" 
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 rtl:space-x-reverse text-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>{t('create_commercial_ad')}</span>
          </Link>
        </div>
      )}
    </PageContainer>
  );
};

export default Dashboard;
