import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CreditCard, User, FileText } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import PageContainer from '@/components/PageContainer';
import AppNavbar from '@/components/AppNavbar';
import BackButton from '@/components/BackButton';
import PageAdvertisement from '@/components/advertisements/PageAdvertisement';
import { supabase } from '@/lib/supabase';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { useAuth } from '@/contexts/AuthContext';


type ReviewStatus = 'pending' | 'approved' | 'rejected';
type Status = 'active' | 'inactive' | 'stolen' | 'pending';

interface PhoneData {
  owner_name: string;
  phone_number: string;
  imei: string;
  phone_type: string;
  password: string;
  id_last6: string;
  phone_image_url: string | null;
  receipt_image_url: string | null;
  registration_date: string;
  review_status: ReviewStatus;
  review_date: string | null;
  status: Status;
  email: string | null;
  user_id: string | null;
}

interface FormData {
  ownerName: string;
  phoneNumber: string;
  imei: string;
  phoneType: string;
  password: string;
  confirmPassword: string;
  idLast6: string;
  phoneImage: File | null;
  receiptImage: File | null;
  review_status?: ReviewStatus;
  review_date?: string | null;
  status?: Status;
}

type ImageType = keyof Pick<FormData, 'phoneImage' | 'receiptImage'>;

const IMEI_LENGTH = 15;

// دوال مساعدة لتنسيق عرض البيانات
const maskName = (name: string): string => {
  if (!name) return '';
  const names = name.split(' ');
  return names.map(part => {
    if (part.length <= 1) return part;
    return part[0] + '*'.repeat(part.length - 1);
  }).join(' ');
};

const maskPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return '*'.repeat(phone.length - 2) + phone.slice(-2);
};

const RegisterPhone: React.FC = () => {
  useScrollToTop();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const fromPurchase = location.state?.fromPurchase;
  const passedImei = location.state?.imei || '';

  const [formData, setFormData] = useState<FormData>({
    ownerName: '',
    phoneNumber: '',
    imei: passedImei,
    phoneType: '',
    password: '',
    confirmPassword: '',
    idLast6: '',
    phoneImage: null,
    receiptImage: null,
    review_status: 'pending' as ReviewStatus,
    review_date: null,
    status: 'active' as Status
  });

  const [previews, setPreviews] = useState<Record<ImageType, string>>({
    phoneImage: '',
    receiptImage: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imeiError, setImeiError] = useState('');


  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    toast({
      title: t(type),
      description: t(message),
      variant: type === 'error' ? 'destructive' : 'default',
      className: 'z-[10001]'
    });
  }, [t, toast]);

  useEffect(() => {
    const fetchBusinessData = async () => {
      // Check if the user is a business user
      if (user && user.role === 'business' && !fromPurchase) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('businesses')
            .select('store_name, phone')
            .eq('user_id', user.id)
            .single();

          if (error) {
            throw error;
          }

          if (data) {
            setFormData(prev => ({
              ...prev,
              ownerName: data.store_name || '',
              phoneNumber: data.phone || ''
            }));
            toast({ title: 'بيانات المتجر', description: 'تم ملء بيانات المالك تلقائياً.' });
          }
        } catch (error) {
          console.error('Error fetching business data:', error);
          toast({ title: 'خطأ', description: 'فشل تحميل بيانات المتجر.', variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchBusinessData();
  }, [user, fromPurchase, t, toast]);

  useEffect(() => {
    if (location.state?.sellerName) {
      setFormData(prev => ({
        ...prev,
        ownerName: location.state.sellerName,
        phoneNumber: location.state.sellerPhone || ''
      }));
    }
  }, [location.state]);

  const checkImeiExists = useCallback(async (imei: string): Promise<{ exists: boolean; phoneDetails: Partial<PhoneData> | null }> => {
    try {
      const cleanImei = imei.trim().replace(/\s+/g, '');
      // استخدم maybeSingle() للحصول على سجل واحد أو null
      const { data, error: phoneError } = await supabase
        .from('registered_phones')
        .select('owner_name, phone_number, phone_image_url, phone_type') // Select more fields
        .eq('imei', cleanImei)
        .maybeSingle(); 

      if (phoneError) {
        console.error('Supabase error checking IMEI (maybeSingle):', phoneError);
        // إلقاء خطأ مخصص يمكن التقاطه لاحقًا
        throw new Error(t('error_checking_imei'));
      }

      return { exists: !!data, phoneDetails: data };
    } catch (err) { // التقاط الأخطاء من Supabase أو الأخطاء الملقاة بشكل صريح
      console.error('Error in checkImeiExists:', err);
      // لا تعرض Toast هنا، دع الدالة المستدعية تقرر
      // أعد إلقاء الخطأ حتى يتمكن المستدعون من معالجته بشكل محدد
      if (err instanceof Error && err.message === t('error_checking_imei')) {
        throw err; // أعد إلقاء خطأنا المحدد
      }
      // تغليف الأخطاء الأخرى
      throw new Error(t('error_checking_imei'));
    }
  }, [t]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow only digits for idLast6 and phoneNumber
    if (name === 'idLast6' || name === 'phoneNumber') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleImeiChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length > IMEI_LENGTH) return;
    
    setImeiError('');
    setFormData(prev => ({ ...prev, imei: value }));

    if (value.length === IMEI_LENGTH) {
      setIsLoading(true);
      try {
        const { exists, phoneDetails } = await checkImeiExists(value);
        if (exists && phoneDetails) {
          setFormData(prev => ({
            ...prev,
            ownerName: user?.role === 'business' ? prev.ownerName : (maskName(phoneDetails.owner_name) || ''),
            phoneNumber: user?.role === 'business' ? prev.phoneNumber : (maskPhoneNumber(phoneDetails.phone_number) || ''),
            phoneType: phoneDetails.phone_type || '',
            phoneImage: null,
          }));
          setPreviews(prev => ({
            ...prev,
            phoneImage: phoneDetails.phone_image_url || '',
          }));
          setImeiError('imei_already_exists');
          showToast('error', 'imei_already_exists_data_prefilled');
        } else {
          setFormData(prev => ({
            ...prev,
            ownerName: user?.role === 'business' ? prev.ownerName : '',
            phoneNumber: user?.role === 'business' ? prev.phoneNumber : '',
            phoneType: '',
            phoneImage: null,
          }));
          setPreviews(prev => ({ ...prev, phoneImage: '' }));
        }
      } catch (error) {
        console.error("Error checking IMEI in handleImeiChange:", error);
        showToast('error', (error instanceof Error) ? error.message : t('error_checking_imei'));
        setFormData(prev => ({
          ...prev,
          ownerName: user?.role === 'business' ? prev.ownerName : '',
          phoneNumber: user?.role === 'business' ? prev.phoneNumber : '',
          phoneType: '',
          phoneImage: null
        }));
        setPreviews(prev => ({ ...prev, phoneImage: '' }));
      } finally {
        setIsLoading(false);
      }
    } 
  }, [checkImeiExists, showToast, t, user]);

  const updateImage = useCallback(async (file: File, type: ImageType) => {
    // Show preview of original file immediately
    const previewUrl = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [type]: previewUrl }));

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
    };

    try {
      toast({ description: t('compressing_image') });
      const compressedFile = await imageCompression(file, options);
      setFormData(prev => ({ ...prev, [type]: compressedFile }));
      toast({ title: t('success'), description: t('image_compressed_successfully') });
    } catch (error) {
      console.error('Image compression error:', error);
      toast({ title: t('error'), description: t('image_compression_failed'), variant: 'destructive' });
      setFormData(prev => ({ ...prev, [type]: file })); // Fallback to original file
    }
  }, [t, toast]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: ImageType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('error', 'file_too_large_10mb');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'invalid_file_type');
      return;
    }

    await updateImage(file, type);
  }, [updateImage, showToast]);

  const startCamera = useCallback(async (direction: 'front' | 'back', type: ImageType) => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false, // Editing with Uri can be complex, better to disable
        resultType: CameraResultType.Uri, // Use Uri for better performance
        source: CameraSource.Camera,
        direction: direction === 'front' ? CameraDirection.Front : CameraDirection.Rear,
      });

      // Use webPath which is available for Uri result type
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `${type}.jpg`, { type: 'image/jpeg' });
        await updateImage(file, type);
      }
    } catch (error) {
      console.error('Camera error:', error);
      showToast('error', 'error_capturing_photo');
    }
  }, [updateImage, showToast]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    const validations = [
      { condition: !formData.ownerName || !formData.phoneNumber || !formData.imei || !formData.phoneType || !formData.password || !formData.confirmPassword || !formData.idLast6, 
        message: 'fill_all_fields' },
      { condition: formData.idLast6.length !== 6, 
        message: 'id_last6_invalid' },
      { condition: formData.password.length < 8, 
        message: 'password_too_short' },
      { condition: formData.password !== formData.confirmPassword, 
        message: 'passwords_dont_match' },
      { condition: !formData.phoneImage, 
        message: 'upload_required_images' }
    ];

    // التحقق من الشروط الأساسية أولاً
    for (const validation of validations) {
      if (validation.condition) {
        showToast('error', validation.message);
        return false;
      }
    }

    // التحقق من IMEI بشكل منفصل لأنه غير متزامن
    if (formData.imei.length !== IMEI_LENGTH) {
      showToast('error', 'invalid_imei_length');
      return false;
    }

    // التحقق غير المتزامن من IMEI
    // لا حاجة لـ setIsLoading هنا لأن handleSubmit يدير الحالة العامة للإرسال
    try {
      const exists = await checkImeiExists(formData.imei);
      if (exists.exists) { // Access the 'exists' property of the returned object
        setImeiError('imei_already_exists'); // قم أيضًا بتحديث الحالة إذا لم يتم تعيينها بالفعل
        showToast('error', 'imei_already_exists');
        return false;
      }
    } catch (error) {
      console.error("Error checking IMEI in validateForm:", error);
      showToast('error', (error instanceof Error && error.message) ? error.message : t('error_checking_imei'));
      return false; // فشل التحقق الحرج، لا تتابع
    }
    // إذا مرت جميع عمليات التحقق، بما في ذلك التحقق غير المتزامن من IMEI

    return true;
  }, [formData, checkImeiExists, showToast, t, setImeiError]); // أضف t و setImeiError


  const savePhoneData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. رفع صورة الهاتف
      let phoneImageUrl = null;
      if (formData.phoneImage) {
        const fileName = `${formData.imei}_phone_${Date.now()}.jpg`;
        const { data: phoneUpload, error: phoneError } = await supabase.storage
          .from('registerphone')
          .upload(fileName, formData.phoneImage);

        if (phoneError) throw phoneError;

        const { data: { publicUrl } } = supabase.storage
          .from('registerphone')
          .getPublicUrl(fileName);

        phoneImageUrl = publicUrl;
      }

      // 2. رفع صورة الفاتورة
      let receiptImageUrl = null;
      if (formData.receiptImage) {
        const fileName = `${formData.imei}_receipt_${Date.now()}.jpg`;
        const { data: receiptUpload, error: receiptError } = await supabase.storage
          .from('registerphone')
          .upload(fileName, formData.receiptImage);

        if (receiptError) throw receiptError;

        const { data: { publicUrl } } = supabase.storage
          .from('registerphone')
          .getPublicUrl(fileName);

        receiptImageUrl = publicUrl;
      }

      // 3. تجهيز بيانات الهاتف للحفظ
      const now = new Date().toISOString();
      const phoneData = {
        owner_name: formData.ownerName,
        phone_number: formData.phoneNumber,
        imei: formData.imei,
        phone_type: formData.phoneType,
        password: formData.password,
        id_last6: formData.idLast6,
        phone_image_url: phoneImageUrl,
        receipt_image_url: receiptImageUrl,
        registration_date: now,
        review_status: null,
        review_date: null,
        status: 'inactive',
        email: user?.email || null,
        user_id: user?.id || null
      };

      // حفظ البيانات في جدول registered_phones
      const { data, error } = await supabase
        .from('registered_phones')
        .insert([phoneData])
        .select();

      if (error) {
        console.error('خطأ في حفظ البيانات:', error);
        if (error.code === '23514') {
          console.error('تفاصيل الخطأ:', {
            sentData: phoneData,
            constraints: error.details,
            message: error.message
          });
          showToast('error', 'invalid_review_status');
        }
        throw error;
      }

      // تنظيف معاينات الصور
      Object.values(previews).forEach(url => url && URL.revokeObjectURL(url));

      // عرض رسالة النجاح
      showToast('success', 'شكراً على تسجيل الهاتف. سيتم مراجعة البيانات خلال 3 أيام عمل');

      // الانتظار 3 ثواني ثم الانتقال للصفحة الرئيسية
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('خطأ في حفظ بيانات الهاتف:', error);
      showToast('error', 'error_saving_data');
    } finally {
      setIsLoading(false);
    }
  }, [formData, previews, showToast, navigate, user]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsLoading(true);

    try {
      const isValid = await validateForm();
      if (isValid) {
        await savePhoneData();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      showToast('error', 'error_submitting_form');
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }, [isSubmitting, validateForm, savePhoneData, showToast]);

  // Effect to clean up object URLs when component unmounts or previews change
  React.useEffect(() => {
    return () => {
      Object.values(previews).forEach(url => url && URL.revokeObjectURL(url));
    };
  }, [previews]); // Re-run effect if previews change

  // تعريف بيانات الصور لتجنب التكرار
  const imageTypesData: { type: ImageType; labelKey: string; icon: React.ElementType; showUpload: boolean; cameraDirection: 'front' | 'back' }[] = [
    { type: 'phoneImage', labelKey: 'phone_image', icon: Camera, showUpload: true, cameraDirection: 'back' },
    { type: 'receiptImage', labelKey: 'receipt_image', icon: FileText, showUpload: true, cameraDirection: 'back' },
  ];


  // دالة مساعدة لعرض قسم تحميل الصورة
  const renderImageUpload = (typeData: typeof imageTypesData[0]) => (
    <div key={typeData.type} className="mb-4 bg-gradient-to-br from-imei-darker via-imei-dark to-imei-darker p-4 rounded-xl border border-imei-cyan/30 hover:border-imei-cyan/60 transition-all duration-300 shadow-lg hover:shadow-xl w-full">
      <div className="flex items-center mb-2">
        <typeData.icon className="w-6 h-6 mr-2 text-imei-cyan" /> {/* استخدام الأيقونة من البيانات */}
        <label className="text-lg font-bold bg-gradient-to-r from-white to-imei-cyan bg-clip-text text-transparent">
          {t(typeData.labelKey)} {/* استخدام مفتاح الترجمة */}
        </label>
      </div>

      <div className="flex flex-col space-y-2">
        {previews[typeData.type] ? (
          <div className="relative group overflow-hidden rounded-lg">
            <img
              src={previews[typeData.type]}
              alt={t(typeData.labelKey)} // استخدام مفتاح الترجمة للنص البديل
              className="w-full h-40 object-cover rounded-lg border border-imei-cyan/30 group-hover:border-imei-cyan/50 transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
              <p className="text-white text-sm font-medium px-4 py-2 rounded-full bg-imei-cyan/20 backdrop-blur-md border border-white/20">
                {t('click_to_change_image')} {/* استخدام مفتاح الترجمة */}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-40 border-2 border-dashed border-imei-cyan/20 rounded-lg flex flex-col items-center justify-center bg-gradient-to-b from-imei-dark/30 to-imei-darker/30 group hover:border-imei-cyan/40 transition-all duration-300">
            <typeData.icon className="w-16 h-16 text-imei-cyan/60 group-hover:text-imei-cyan/80 transition-colors duration-300" strokeWidth={1} /> {/* استخدام الأيقونة من البيانات */}
            <p className="text-center text-sm text-imei-cyan/60 mt-2">{t(`no_${typeData.labelKey.replace('_image', '')}_preview`)}</p> {/* استخدام مفتاح ترجمة ديناميكي */}
            <p className="text-xs mt-1 text-imei-cyan/40">{t('image_will_be_displayed_here')}</p> {/* استخدام مفتاح الترجمة */}
          </div>
        )}

        <div className="flex space-x-2">
          {typeData.showUpload && ( // عرض زر التحميل بشكل شرطي
            <>
              <input
                type="file"
                id={`${typeData.type}-upload`}
                accept="image/*"
                onChange={(e) => handleFileChange(e, typeData.type)}
                className="hidden"
                required={typeData.type !== 'receiptImage'} // Make receipt image optional
              />
              {/* تم إلغاء تعليق زر "رفع" (Upload) */}
              <label
                htmlFor={`${typeData.type}-upload`}
                className="flex-1 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 text-white py-2 px-2 rounded-lg text-center cursor-pointer transition-all duration-300 shadow hover:shadow-md flex items-center justify-center text-sm"
              >
                <Upload className="w-4 h-4 mr-1" />
                {t('upload')} {/* استخدام مفتاح الترجمة */}
              </label>
            </>
          )}

          <Button
            type="button"
            onClick={() => startCamera(typeData.cameraDirection, typeData.type)} // استخدام اتجاه الكاميرا من البيانات
            className="flex-1 bg-gradient-to-r from-cyan-800 via-cyan-700 to-cyan-800 hover:from-cyan-700 hover:via-cyan-600 hover:to-cyan-700 text-white py-2 px-2 rounded-lg transition-all duration-300 shadow hover:shadow-md flex items-center justify-center text-sm"
          >
            <Camera className="w-4 h-4 mr-1" />
            {t('capture')} {/* استخدام مفتاح الترجمة */}
          </Button>
        </div>
      </div>
    </div>
  );


  return (
    <PageContainer>
      <AppNavbar />

      {/* إضافة مكون الإعلانات */}
      <PageAdvertisement pageName="registerphone" />

      {/* تغليف محتوى النموذج الرئيسي في div جديد */}
      {/* استخدام my-6 لإضافة مسافة علوية وسفلية */}
      {/* {{ edit_1 }} */}
      {/* <div className="my-6"> */}
      <div className="flex items-center mb-6">
        <BackButton to="/dashboard" className="mr-4" /> {/* زر الرجوع */}
        <h1 className="text-white text-2xl font-bold text-center flex-1 pr-10">
          {t('register_new_phone')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* حقول النموذج */}
        <div>
          <label htmlFor="imei" className="block text-white text-sm font-medium mb-1">
            IMEI
          </label>
          <input
            type="text"
            id="imei"
            name="imei"
            value={formData.imei}
            onChange={handleImeiChange}
            className={`input-field w-full ${imeiError ? 'border-red-500' : ''}`}
            maxLength={IMEI_LENGTH}
            pattern="[0-9]*"
            inputMode="numeric"
            required
          />
          {imeiError && (
            <p className="text-red-500 text-sm mt-1">{t(imeiError)}</p>
          )}
        </div>

        <div>
          <label htmlFor="ownerName" className="block text-white text-sm font-medium mb-1">
            {t('owner_name')}
          </label>
          <input
            type="text"
            id="ownerName"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            className="input-field w-full"
            disabled={user?.role === 'business' || isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-white text-sm font-medium mb-1">
            {t('phone_number')}
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="input-field w-full"
            disabled={user?.role === 'business' || isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="phoneType" className="block text-white text-sm font-medium mb-1">
            {t('phone_type')}
          </label>
          <input
            type="text"
            id="phoneType"
            name="phoneType"
            value={formData.phoneType}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="idLast6" className="block text-white text-sm font-medium mb-1">
            آخر 6 أرقام من البطاقة الشخصية
          </label>
          <input
            type="text"
            id="idLast6"
            name="idLast6"
            value={formData.idLast6}
            onChange={handleChange}
            className="input-field w-full"
            maxLength={6}
            pattern="[0-9]*"
            inputMode="numeric"
            placeholder="******"
            required
          />
        </div>

        {/* حقول كلمة المرور */}
        <div>
          <label htmlFor="password" className="block text-white text-sm font-medium mb-1">
            {t('password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-white text-sm font-medium mb-1">
            {t('confirm_password')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="input-field w-full"
            required
          />
        </div>

        {/* أقسام تحميل الصور باستخدام الدالة المساعدة */}
        <div className="space-y-4">
          <h3 className="text-white text-lg font-semibold">{t('upload_images')}</h3>
          {imageTypesData.map(renderImageUpload)}
        </div>

        {/* زر التسجيل */}
        <Button
          type="submit"
          // تم تغيير فئات التدرج اللوني إلى البرتقالي
          className="glowing-button w-full mt-6 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-400 hover:to-orange-500 text-white"
          // {{ edit_1 }}
          // className="glowing-button w-full mt-6"
          disabled={isSubmitting || imeiError !== ''}
        >
          {isSubmitting ? t('submitting') : t('register_phone')}
        </Button>
      </form>
      {/* </div> */}
    </PageContainer>
  );
};

export default RegisterPhone;