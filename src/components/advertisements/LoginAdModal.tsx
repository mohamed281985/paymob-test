import React from 'react';
import { X } from 'lucide-react';
import { useOptimizedImage, OptimizedImage, getTransformedImageUrl } from '@/lib/imageUtils';
import useSpecialAdDisplay from '../../hooks/useSpecialAdDisplay';

interface Advertisement {
  id: string;
  image_url: string;
  website_url?: string;
}

interface LoginAdModalProps {
  ad: Advertisement;
  onClose: () => void;
}

const LoginAdModal: React.FC<LoginAdModalProps> = ({ ad, onClose }) => {
  const handleAdClick = () => {
    if (ad.website_url) {
      window.open(ad.website_url, '_blank', 'noopener,noreferrer');
    }
  };

  const [useOriginalImage, setUseOriginalImage] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 3;

  // تحديد ما إذا كان يجب عرض الإعلان المميز
  const shouldDisplayAd = useSpecialAdDisplay();

  // تجهيز رابط الصورة المحسنة أو الأصلية
  const imageUrl = React.useMemo(() => {
    // التحقق من صحة رابط الصورة
    if (!ad.image_url) {
      console.error('رابط الصورة غير موجود');
      return '';
    }

    try {
      // محاولة استخدام الصورة من التخزين المؤقت أولاً
      const cachedUrl = sessionStorage.getItem(`ad-image-${ad.id}`);
      if (cachedUrl && retryCount === 0) {
        return cachedUrl;
      }

      if (useOriginalImage) {
        const originalUrl = ad.image_url;
        // التحقق من أن الرابط يبدأ بـ https://
        if (!originalUrl.startsWith('https://')) {
          throw new Error('رابط الصورة غير آمن');
        }
        sessionStorage.setItem(`ad-image-${ad.id}`, originalUrl);
        return originalUrl;
      }

      // محاولة تحسين الصورة مع معلمات مختلفة بناءً على عدد المحاولات
      const quality = Math.max(60, 85 - (retryCount * 10)); // تقليل الجودة مع كل محاولة
      const width = Math.max(800, 1200 - (retryCount * 200)); // تقليل العرض مع كل محاولة

      const optimizedUrl = getTransformedImageUrl(ad.image_url, { 
        width, 
        quality,
        format: 'webp',
        cache: true,
        blur: retryCount > 0 ? false : undefined // تعطيل التمويه بعد المحاولة الأولى
      });

      if (optimizedUrl) {
        sessionStorage.setItem(`ad-image-${ad.id}`, optimizedUrl);
        return optimizedUrl;
      }
      throw new Error('فشل في إنشاء رابط محسن');
    } catch (error) {
      console.warn('خطأ في تحسين الصورة، جاري استخدام الصورة الأصلية:', error);
      if (!useOriginalImage && retryCount < maxRetries) {
        // زيادة عداد المحاولات وتجربة مرة أخرى
        setRetryCount(prev => prev + 1);
      } else {
        setUseOriginalImage(true);
      }
      return ad.image_url;
    }
  }, [ad.id, ad.image_url, useOriginalImage, retryCount]);

  // تحميل مسبق للصورة عند تهيئة المكون
  React.useEffect(() => {
    let isSubscribed = true;

    // تحقق مما إذا كانت الصورة موجودة في ذاكرة التخزين المؤقت للمتصفح
    const cachedImage = new Image();
    cachedImage.crossOrigin = 'anonymous';
    cachedImage.src = imageUrl;

    if (cachedImage.complete) {
      // إذا كانت الصورة مخزنة مؤقتاً، قم بعرضها فوراً
      setImageLoaded(true);
      setImageError(false);
      return;
    }

    const handleLoad = () => {
      if (isSubscribed) {
        setImageLoaded(true);
        setImageError(false);
        setRetryCount(0); // إعادة تعيين عداد المحاولات عند النجاح
        
        try {
          // تخزين الصورة في ذاكرة التخزين المؤقت
          const canvas = document.createElement('canvas');
          canvas.width = cachedImage.width;
          canvas.height = cachedImage.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(cachedImage, 0, 0);
            // تحويل الصورة إلى Base64 للتخزين المؤقت
            const dataUrl = canvas.toDataURL('image/webp', 0.8);
            sessionStorage.setItem(`ad-image-data-${ad.id}`, dataUrl);
          }
        } catch (err) {
          console.warn('فشل في تخزين الصورة في الذاكرة المؤقتة:', err);
        }
      }
    };

    // إضافة تسجيلات لفحص بيانات الإعلان
    console.log('بيانات الإعلان:', ad);

    // تسجيل الرابط المحسّن أو الأصلي
    console.log('الرابط المستخدم لتحميل الصورة:', imageUrl);

    // تسجيل الأخطاء عند حدوثها
    const handleError = () => {
      if (!isSubscribed) return;

      console.warn(`فشل في تحميل الصورة (محاولة ${retryCount + 1} من ${maxRetries})`);
      
      if (retryCount < maxRetries) {
        // محاولة تحميل الصورة مرة أخرى مع معلمات مختلفة
        setRetryCount(prev => prev + 1);
      } else if (!useOriginalImage) {
        // محاولة استخدام الصورة الأصلية
        console.log('جاري محاولة تحميل الصورة الأصلية...');
        setUseOriginalImage(true);
        setRetryCount(0);
      } else {
        // فشل جميع المحاولات
        console.error('فشل في تحميل الصورة بعد جميع المحاولات');
        setImageError(true);
        setImageLoaded(false);
      }
    };

    cachedImage.onload = handleLoad;
    cachedImage.onerror = handleError;

    return () => {
      isSubscribed = false;
      cachedImage.onload = null;
      cachedImage.onerror = null;
    };
  }, [imageUrl, useOriginalImage]);

  // تحميل الصور مسبقًا عند بدء التطبيق
  React.useEffect(() => {
    const preloadImage = new Image();
    preloadImage.src = ad.image_url;
    preloadImage.onload = () => {
      console.log('تم تحميل الصورة مسبقًا:', ad.image_url);
    };
    preloadImage.onerror = () => {
      console.warn('فشل تحميل الصورة مسبقًا:', ad.image_url);
    };
  }, [ad.image_url]);

  if (!shouldDisplayAd) {
    return null; // لا تعرض المكون إذا لم يكن من المفترض عرضه
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]">
      <div className="relative bg-transparent p-4 overflow-hidden" style={{ width: '90vw', height: '85vh' }}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors z-50 shadow-xl"
          aria-label="Close ad"
        >
          <X size={24} strokeWidth={2.5} />
        </button>
        <div className="flex items-center justify-center h-full w-full cursor-pointer" onClick={handleAdClick}>
          {imageError && (
            <div className="absolute text-red-500">حدث خطأ في تحميل الصورة</div>
          )}
          <>
            {/* إضافة preload link لتحميل الصورة مسبقاً */}
            <link rel="preload" href={imageUrl} as="image" />
            <img
              src={imageUrl}
              crossOrigin="anonymous"
              alt="Advertisement"
              className={`w-full h-full object-contain transition-all duration-[300ms] ease-out ${
                !imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))'
              }}
              loading="eager"
              fetchPriority="high"
              decoding="sync"
            />
          </>
        </div>
      </div>
    </div>
  );
};

export default LoginAdModal;