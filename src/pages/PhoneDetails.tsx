import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase'; // استيراد Supabase
import PageContainer from '../components/PageContainer';
import AppNavbar from '../components/AppNavbar';
import { Phone, Calendar, MapPin, User, Shield, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react'; // إضافة CheckCircle و AlertTriangle
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ImageViewer from '@/components/ImageViewer';

// واجهة لبيانات الهاتف (يمكن تعديلها لتطابق جدول Supabase)
interface PhoneReport {
  id: string; // أو number
  imei: string;
  owner_name: string;
  phone_type?: string; // قد لا يكون موجودًا في كل البلاغات
  phone_number?: string; // رقم هاتف المالك من البلاغ
  loss_time: string; // أو Date
  loss_location: string;
  status: 'active' | 'resolved' | 'pending'; // أو أي حالات أخرى
  phone_image_url?: string; // اسم العمود في Supabase
  contact_phone?: string; // رقم هاتف الشخص الذي وجد الهاتف (إذا كان متاحًا)
  id_last6?: string; // رقم البطاقة الشخصية (آخر 6 أرقام)
}

// دالة لإخفاء اسم المالك
const maskName = (name: string | undefined | null): string => {
  if (!name) {
    return '';
  }

  // تقسيم الاسم إلى كلمات
  const words = name.trim().split(/\s+/);

  // معالجة كل كلمة - النجوم أولاً والحرف الأول في النهاية
  const maskedWords = words.map(word => {
    if (word.length <= 1) return word;
    // 6 نجوم متبوعة بالحرف الأول من الكلمة
    return '******' + word.charAt(0);
  });

  // إعادة تجميع الكلمات بالترتيب الأصلي مع إضافة مسافات كبيرة
  return maskedWords.join('          ');  // 10 مسافات بين كل اسم
};

// دالة لإخفاء رقم الهاتف: إظهار آخر رقمين أولاً ثم النجوم
const maskPhoneNumber = (phoneNumber: string | undefined | null): string => {
  if (!phoneNumber || phoneNumber.length <= 2) {
    return phoneNumber || ''; // إرجاع الرقم كما هو إذا كان قصيرًا جدًا أو غير موجود
  }

  // الحصول على آخر رقمين
  const lastTwoDigits = phoneNumber.slice(-2);

  // إظهار الرقمين أولاً ثم النجوم (بدون مسافات)
  return lastTwoDigits + '*'.repeat(Math.min(phoneNumber.length - 2, 8));
};

const maskIdNumber = (idNumber: string | undefined | null): string => {
  if (!idNumber || idNumber.length <= 4) {
    return idNumber || '';
  }

  // الحصول على آخر 4 أرقام
  const lastFourDigits = idNumber.slice(-4);

  // إظهار الأرقام أولاً ثم النجوم (بدون مسافات)
  return lastFourDigits + '*'.repeat(Math.min(idNumber.length - 4, 6));
};

const PhoneDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phone, setPhone] = useState<PhoneReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showFinderContact, setShowFinderContact] = useState(false);
  
  // حالة عرض الصور المكبرة
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  useEffect(() => {
    const fetchPhoneDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      // جلب تفاصيل الهاتف من Supabase بناءً على id أو imei
      // إذا كان id هو imei، استخدم eq('imei', id)
      // إذا كان id هو المعرف الفريد، استخدم eq('id', id)
      const { data, error } = await supabase
        .from('phone_reports') // اسم جدول بلاغات الهواتف
        .select('*') // اختر الحقول التي تحتاجها
        .or(`id.eq.${id},imei.eq.${id}`) // البحث بالـ ID أو IMEI
        .maybeSingle();

      if (error) {
        console.error('Error fetching phone details:', error);
        toast({ title: t('error'), description: t('error_fetching_phone_details'), variant: 'destructive' });
        setPhone(null);
      } else {
        setPhone(data as PhoneReport);
      }
      setIsLoading(false);
    };

    fetchPhoneDetails();
  }, [id, t, toast]);

  const handlePayment = () => {
    setShowPaymentDialog(true);
  };

  const processPayment = () => {
    if (!phoneNumber) {
      toast({
        title: t('error'),
        description: t('please_enter_phone'),
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      setShowPaymentDialog(false);
      setShowFinderContact(true);
      toast({
        title: t('payment_success'),
        description: t('payment_processed'),
      });
    }, 1500);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <AppNavbar />
        <div className="my-6 text-center text-white">{t('loading')}...</div>
      </PageContainer>
    );
  }

  if (!phone) {
    return (
      <PageContainer>
        <AppNavbar />
        <div className="my-6 text-center">
          <h1 className="text-white text-xl">{t('phone_not_found')}</h1>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 flex items-center text-imei-cyan hover:underline"
          >
            <ArrowLeft size={16} className="mr-1" />
            {t('go_back')}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AppNavbar />
      <div className="my-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-imei-cyan hover:underline"
        >
          <ArrowLeft size={16} className="mr-1" />
          {t('go_back')}
        </button>

        <h1 className="text-white text-2xl font-bold mb-6">
          {t('phone_details')}
        </h1>

        {/* حالة الهاتف - تم التعديل لعرض الحالة الفعلية */}
        <div className={`rounded-md p-4 mb-6 ${phone.status === 'resolved' ? 'bg-green-900 bg-opacity-20 border border-green-500' : 'bg-red-900 bg-opacity-20 border border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div className="text-white">
              <span className="font-medium">{t('status')}: </span>
              <span className={`${phone.status === 'resolved' ? 'text-green-400' : 'text-red-400'}`}>
                {phone.status === 'resolved' ? t('phone_found_message') : t('phone_lost_message')} {/* استخدام مفاتيح الترجمة للحالة */}
              </span>
            </div>
            {phone.status === 'resolved' ? (
              <CheckCircle size={20} className="text-green-400" />
            ) : (
              <AlertTriangle size={20} className="text-red-400" />
            )}
          </div>
        </div>

        {/* صورة الهاتف */}
        <div className="mb-6">
          <div className="bg-imei-darker rounded-xl overflow-hidden border border-imei-cyan border-opacity-20">
            {phone.phone_image_url ? (
              <button 
                onClick={() => {
                  setSelectedImage(phone.phone_image_url);
                  setIsImageViewerOpen(true);
                }}
                className="w-full cursor-pointer"
              >
                <img
                  src={phone.phone_image_url}
                  alt={t('phone_image')}
                  className="w-full h-64 object-contain p-4 transition-transform hover:scale-[1.02]"
                />
              </button>
            ) : (
              <div className="w-full h-64 flex items-center justify-center">
                <Phone size={80} className="text-imei-cyan" />
              </div>
            )}
          </div>
        </div>

        {/* رقم IMEI */}
        <div className="card-container mb-6">
          <h3 className="text-imei-cyan font-medium mb-2">IMEI</h3>
          <div className="bg-imei-dark p-3 rounded-md">
            <p className="text-white font-mono text-center text-xl">{phone.imei}</p>
          </div>
        </div>

        {/* معلومات الفقدان */}
        <div className="card-container mb-6">
          <h3 className="text-imei-cyan font-medium mb-3">{t('loss_info')}</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <User size={18} className="text-imei-cyan mr-2" />
              <div>
                <span className="text-gray-400 text-sm block">{t('owner_name')}</span>
                <span className="text-white">{maskName(phone.owner_name)}</span>
              </div>
            </div>

            {/* رقم هاتف المالك (مخفي) */}
            <div className="flex items-center">
              <Phone size={18} className="text-imei-cyan mr-2" />
              <div>
                <span className="text-gray-400 text-sm block">{t('phone_number')}</span>
                <span className="text-white">{maskPhoneNumber(phone.phone_number)}</span>
              </div>
            </div>

            <div className="flex items-center">
              <Shield size={18} className="text-imei-cyan mr-2" />
              <div>
                <span className="text-gray-400 text-sm block">{t('id_number')}</span>
                <span className="text-white">{maskIdNumber(phone.id_last6)}</span>
              </div>
            </div>

            <div className="flex items-center">
              <MapPin size={18} className="text-imei-cyan mr-2" />
              <div>
                <span className="text-gray-400 text-sm block">{t('loss_location')}</span>
                <span className="text-white">{phone.loss_location}</span>
              </div>
            </div>

            <div className="flex items-center">
              <Calendar size={18} className="text-imei-cyan mr-2" />
              <div>
                <span className="text-gray-400 text-sm block">{t('loss_time')}</span>
                <span className="text-white">{new Date(phone.loss_time).toLocaleDateString(language)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار التواصل - تم إخفاء زر "إبلاغ المالك" إذا كانت الحالة "resolved" */}
        {phone.status === 'active' && ( // عرض الأزرار فقط إذا كانت الحالة "active" (مفقود)
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Button
              onClick={() => {
                toast({
                  title: t('notification_sent'),
                  description: t('owner_will_be_notified')
                });
              }}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {t('notify_owner')}
            </Button>
          </div>
        )}


        {/* مربعات الحوار */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('payment_required')}</DialogTitle>
              <DialogDescription>{t('enter_phone_number')}</DialogDescription>
            </DialogHeader>
            <Input
              type="tel"
              placeholder={t('phone_number_placeholder')}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={() => setShowPaymentDialog(false)} variant="outline">
                {t('cancel')}
              </Button>
              <Button onClick={processPayment} disabled={processing}>
                {processing ? t('processing') : t('proceed_payment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* مربع حوار معلومات الاتصال */}
        <Dialog open={showFinderContact} onOpenChange={setShowFinderContact}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('finder_contact_info')}</DialogTitle>
              <DialogDescription>{t('finder_contact_description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-center">{t('finder_phone')}: {phone.contact_phone || t('not_available')}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowFinderContact(false)}>
                {t('close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* مكون عارض الصور */}
        <ImageViewer
          imageUrl={selectedImage || ''}
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
        />
      </div>
    </PageContainer>
  );
};

export default PhoneDetails;