import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAds } from '../contexts/AdContext';
import { Edit, Trash2 } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Import the Advertisement type from AdContext to ensure consistency
import type { Advertisement } from '../contexts/AdContext';
import { supabase } from '@/lib/supabase';

interface Ad extends Omit<Advertisement, 'adType'> {
  adType: 'normal' | 'special';
  user_id: string;
  upload_date?: string;
  created_at?: string;
  latitude?: number;
  longitude?: number;
}

const MyAds: React.FC = (): React.ReactNode => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { ads: rawAds, deleteAd } = useAds();
  const ads = rawAds as Advertisement[];
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (adId: string, adType: 'normal' | 'special') => {
    if (!window.confirm(t('delete_confirmation') || 'هل أنت متأكد من حذف هذا الإعلان؟')) return;

    // العثور على الإعلان في القائمة للحصول على البيانات الكاملة
    const adToDelete = myAds.find(ad => ad.id === adId);
    if (!adToDelete) {
      console.error('لم يتم العثور على الإعلان في القائمة المحلية');
      return;
    }

    setDeletingId(adId);
    try {
      if (adType === 'special') {
        // ابحث عن الإعلان المميز أولاً
        const { data: specialAd, error: findError } = await supabase
          .from('special_ad')
          .select()
          .eq('user_id', user?.id)
          .eq('store_name', adToDelete.store_name)
          .eq('created_at', adToDelete.created_at)
          .single();

        console.log('specialAd fetched:', specialAd);

        if (findError || !specialAd) {
          console.error('لم يتم العثور على الإعلان المميز أو حدث خطأ:', findError);
          throw new Error('لم يتم العثور على الإعلان المميز');
        }

        let specialDeleteError;
        if (specialAd.id) {
          // حذف باستخدام id إذا كان موجودًا
          ({ error: specialDeleteError } = await supabase
            .from('special_ad')
            .delete()
            .eq('id', specialAd.id));
        } else {
          // إذا لم يوجد id، احذف باستخدام الشروط الثلاثة
          ({ error: specialDeleteError } = await supabase
            .from('special_ad')
            .delete()
            .eq('user_id', user?.id)
            .eq('store_name', adToDelete.store_name)
            .eq('created_at', adToDelete.created_at));
        }

        if (specialDeleteError) {
          console.error('خطأ في حذف الإعلان المميز:', specialDeleteError);
          throw new Error('حدث خطأ أثناء حذف الإعلان المميز');
        }
      }

      console.log('محاولة حذف الإعلان من جدول الإعلانات الرئيسي...');
      
      // استخدام created_at كمعرف للبحث
      const searchQuery = adToDelete.id ? 
        { id: adToDelete.id } : 
        { id: null };
      
      console.log('البحث باستخدام:', searchQuery);

      console.log('بيانات الإعلان للحذف:', { 
        userId: user?.id,
        adId: searchQuery.id
      });

      const { error: deleteError, data: deletedData } = await supabase
        .from('advertisements')
        .delete()
        .eq('user_id', user?.id)
        .eq('id', searchQuery.id)
        .select();

      console.log('نتيجة حذف الإعلان:', { deleteError, deletedData });

      if (deleteError) {
        console.error('خطأ في حذف الإعلان:', deleteError);
        throw new Error('فشل في حذف الإعلان من قاعدة البيانات');
      }

      // التحقق من نجاح الحذف
      if (adType === 'special') {
        // التأكد من حذف الإعلان من جدول special_ad
        const { data: checkSpecial } = await supabase
          .from('special_ad')
          .select('*')
          .eq('user_id', user?.id)
          .eq('image_url', adToDelete.image_url);

        console.log('التحقق من حذف الإعلان المميز:', checkSpecial);

        if (checkSpecial && checkSpecial.length > 0) {
          throw new Error('لم يتم حذف الإعلان المميز بشكل صحيح');
        }
      }

      // التحقق من حذف الإعلان من جدول advertisements
      const { data: checkMain } = await supabase
        .from('advertisements')
        .select('*')
        .eq('id', adToDelete.id)
        .eq('user_id', user?.id);

      console.log('التحقق من حذف الإعلان الرئيسي:', checkMain);

      if (checkMain && checkMain.length > 0) {
        throw new Error('لم يتم حذف الإعلان من قاعدة البيانات الرئيسية');
      }

      console.log('تم التأكد من حذف الإعلان بنجاح');
      console.log('تحديث واجهة المستخدم...');
      
      // تحديث واجهة المستخدم فقط بعد التأكد من نجاح الحذف
      setMyAds((currentAds) => currentAds.filter((ad) => ad.id !== adId));
      await deleteAd(adId, adType === 'special');
      
      toast({
        title: t('success'),
        description: t('ad_deleted_successfully') || 'تم حذف الإعلان بنجاح'
      });
    } catch (error: any) {
      console.error('تفاصيل الخطأ الكامل:', {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: t('error'),
        description: error.message || t('delete_error') || 'حدث خطأ أثناء الحذف',
        variant: 'destructive'
      });

      const ad = myAds.find(a => a.id === adId);
      if (ad) {
        setMyAds(currentAds => [...currentAds]);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (adId: string, adType: 'normal' | 'special') => {
    try {
      const path = adType === 'special' ? '/special-ad' : '/publish-ad';
      navigate(`${path}?id=${adId}`);
    } catch (error) {
      console.error('Error navigating to edit page:', error);
      toast({
        title: t('error'),
        description: t('error_editing_ad') || 'حدث خطأ أثناء محاولة تعديل الإعلان',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const loadUserAds = async () => {
      if (!user) return;
      setLoadingAds(true);
      try {
        // الإعلانات العادية
        const userAds = ads
          .filter(ad => ad.user_id === user.id)
          .sort((a, b) => 
            new Date(b.upload_date || '').getTime() - new Date(a.upload_date || '').getTime()
          )
          .map(ad => ({
            ...ad,
            adType: 'normal'
          } as Ad));

        // جلب الإعلانات المميزة من جدول special_ad
        const { data: specialAds, error: specialError } = await supabase
          .from('special_ad')
          .select('*')
          .eq('user_id', user.id);

        if (specialError) {
          console.error('خطأ في جلب الإعلانات المميزة:', specialError);
        }

        const mappedSpecialAds: Ad[] = (specialAds || []).map((ad: any) => ({
          ...ad,
          adType: 'special',
        }));

        // دمج القائمتين
        const combinedAds = [...userAds, ...mappedSpecialAds];

        // استخدام Map لإزالة التكرارات مع إعطاء الأولوية للإعلانات المميزة
        // هذا يحل مشكلة ظهور الإعلانات المميزة مرتين (مرة كإعلان عادي ومرة كمميز)
        const adMap = new Map<string, Ad>();
        combinedAds.forEach(ad => {
          // نستخدم image_url كمعرف فريد للإعلان
          const existingAd = adMap.get(ad.image_url);
          // إذا لم يكن الإعلان موجودًا، أو إذا كان الإعلان الحالي "مميز"، فسيتم إضافته أو استبدال العادي
          if (!existingAd || ad.adType === 'special') {
            adMap.set(ad.image_url, ad);
          }
        });

        const uniqueAds = Array.from(adMap.values());

        // ترتيب الإعلانات النهائية حسب تاريخ الإنشاء
        uniqueAds.sort((a, b) => new Date(b.created_at || b.upload_date || '').getTime() - new Date(a.created_at || a.upload_date || '').getTime());
        setMyAds(uniqueAds);
      } catch (error) {
        console.error('Error filtering user ads:', error);
        toast({
          title: t('error'),
          description: t('error_fetching_ads') || 'حدث خطأ أثناء جلب الإعلانات',
          variant: 'destructive'
        });
      } finally {
        setLoadingAds(false);
      }
    };
    loadUserAds();
  }, [user, ads, t, toast]);



  return (
    <PageContainer>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-8">{t('my_ads') || 'إعلاناتي'}</h1>
        {loadingAds ? (
          <div className="text-center text-gray-400">{t('loading') || 'جاري التحميل...'}</div>
        ) : myAds.length === 0 ? (
          <div className="text-center text-gray-400">{t('no_ads_found') || 'لا توجد إعلانات بعد.'}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {myAds.map((ad) => (
              <div
                key={`${ad.adType}-${ad.id}`}
                className={`bg-imei-darker rounded-xl p-4 border border-imei-cyan/20 flex flex-col gap-2 ${
                  ad.adType === 'special' ? 'border-yellow-500' : ''
                }`}
              >
                <img
                  src={ad.image_url}
                  alt="ad"
                  className="w-full h-40 object-contain rounded mb-2 bg-black/10"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-white font-semibold">
                    {ad.store_name || t('ad')}
                    {ad.adType === 'special' && (
                      <span className="ml-2 text-yellow-500 text-xs">{t('special_ad') || 'إعلان مميز'}</span>
                    )}
                  </span>
                  {ad.website_url && (
                    <a
                      href={ad.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-imei-cyan text-xs underline"
                    >
                      {ad.website_url}
                    </a>
                  )}
                  <span className="text-xs text-gray-400">{ad.upload_date?.slice(0, 10)}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 flex items-center gap-1 border-imei-cyan text-imei-cyan hover:bg-imei-cyan/10"
                    onClick={() => handleEdit(ad.id, ad.adType)}
                  >
                    <Edit className="w-4 h-4" /> {t('edit') || 'تعديل'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 flex items-center gap-1"
                    disabled={deletingId === ad.id}
                    onClick={() => {
                      console.log('زر الحذف: نوع الإعلان', ad.adType, 'بيانات الإعلان:', ad);
                      handleDelete(ad.id, ad.adType);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingId === ad.id
                      ? t('deleting') || 'جاري الحذف...'
                      : t('delete') || 'حذف'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default MyAds;
