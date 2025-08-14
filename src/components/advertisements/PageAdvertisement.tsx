// دالة تحويل الدرجات إلى راديان
function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// دالة حساب المسافة بين نقطتين (Haversine) بالكيلومتر
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}
import localAdImage from '@/assets/images/ads/default_ad.jpeg';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Advertisement {
  id: number;
  image_url: string;
  is_active: boolean;
  page: string;
  website_url?: string;
}

interface PageAdvertisementProps {
  pageName: string;
}

const PageAdvertisement = ({ pageName }: PageAdvertisementProps) => {
  const [ads, setAds] = useState<Advertisement[] | null>([ {id:0, image_url:localAdImage,is_active:true,page:pageName} ]); //Initial local ad
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    // جلب موقع المستخدم
    if (!('geolocation' in navigator)) {
      fetchAds(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        fetchAds(coords);
      },
      () => {
        fetchAds(null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    // eslint-disable-next-line
  }, [pageName]);

  // دالة جلب الإعلانات وفلترتها حسب الموقع
  const fetchAds = async (coords: { latitude: number; longitude: number } | null) => {
    const { data } = await supabase
    .from('advertisements')
    .select('*')
    .or(`page.eq.${pageName},page.is.null,page.eq.`)
    .eq('is_active', true)
    .order('upload_date', { ascending: false });

    if (!data) {
    console.log("No advertisements found, using local ad.");
    localStorage.setItem('ads', JSON.stringify([])); // Store empty array in local storage
    return;
    }
  
    // نبدأ بعرض الإعلانات العامة فوراً (بدون موقع)
    const globalAds = data.filter(ad => !ad.latitude && !ad.longitude);
    let fetchedAds = globalAds;

    // ثم نقوم بإضافة الإعلانات القريبة إذا كانت متوفرة
    if (coords) {
    // تصنيف الإعلانات حسب المسافة
      const nearbyAds = data
      .filter(ad => ad.latitude && ad.longitude)
      .map(ad => ({
          ...ad,
          distance: getDistanceFromLatLonInKm(coords.latitude, coords.longitude, ad.latitude!, ad.longitude!)
        }))
        .sort((a, b) => a.distance - b.distance); // ترتيب حسب الأقرب

      // تحديد الإعلانات ضمن النطاق الموسع (3 كم)
    const inRangeAds = nearbyAds.filter(ad => ad.distance <= 3);
    
      fetchedAds = inRangeAds;

    
      if (inRangeAds.length > 0) {

    


    

        // دمج الإعلانات القريبة مع الإعلانات العامة مع تجنب التكرار
        const allAds = [...inRangeAds, ...globalAds];
        const uniqueAds = Array.from(new Map(allAds.map(ad => [ad.id, ad])).values());
        setAds(uniqueAds);
      }
    }
  };
  
    useEffect(() => {
      const loadAndSetAds = async () => {
          await fetchAds(null); // Fetch ads 
          // Load from localStorage after fetching
        localStorage.setItem('ads', JSON.stringify(ads));
      }
  
      loadAndSetAds();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageName]);
  

  // إضافة مؤقت لتغيير الصور كل 2 ثانية
  useEffect(() => {
    if (ads.length <= 1) return;

    // Preload the next image
    const nextAdIndex = (currentAdIndex + 1) % ads.length;
    const nextImageUrl = ads[nextAdIndex].image_url;
    const img = new Image();
    img.src = nextImageUrl;

    const timer = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [ads?.length, currentAdIndex, ads]); // Added currentAdIndex and ads to dependencies

  if (ads.length === 0) return null;

  return (
    <div className="space-y-4 my-4 sticky top-10 z-10">
      {ads.length > 0 && (
        <div className="rounded-lg overflow-hidden shadow-md w-full aspect-video relative bg-gray-100">
          {ads[currentAdIndex]?.website_url ? (
            <a
              href={ads[currentAdIndex].website_url}
              target="_blank"
              rel="noopener noreferrer"
              title="اضغط لزيارة رابط الإعلان"
              className="block w-full h-full relative"
            >
              <img
                src={ads[currentAdIndex]?.image_url}
                alt="إعلان"
                className="w-full h-full object-cover absolute inset-0 cursor-pointer"
                // Removed loading="lazy" for immediate display
              />
              <div
                className="absolute bottom-2 left-2 bg-orange-500 text-black text-xs font-bold px-3 py-1 rounded shadow-lg z-20"
                style={{direction: 'rtl', pointerEvents: 'none'}}
              >
                اضغط للتواصل
              </div>
            </a>
          ) : (
            <img
              src={ads[currentAdIndex]?.image_url}
              alt="إعلان"
              className="w-full h-full object-cover absolute inset-0"
              // Removed loading="lazy" for immediate display
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PageAdvertisement;


/*
شرح الكود:

1. استيراد الصورة المحلية: قمنا بتغيير تنسيق الصورة المحلية المستوردة إلى JPG (default_ad.jpg). تأكد من وجود هذه الصورة في مسار assets/images/ads.

*/