import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import imageCompression from 'browser-image-compression';
import PageContainer from '../components/PageContainer';
import AppNavbar from '../components/AppNavbar';
import BackButton from '../components/BackButton';
import { Camera, FileText, CreditCard, User, Upload, AlertTriangle } from 'lucide-react'; // إضافة AlertTriangle
import { useToast } from '@/hooks/use-toast';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import PageAdvertisement from '@/components/advertisements/PageAdvertisement';
import { useScrollToTop } from '../hooks/useScrollToTop';
import { supabase } from '@/lib/supabase'; // استيراد Supabase
import { useAuth } from '../contexts/AuthContext';

// تعريف واجهة البيانات للنموذجا
interface FormData {
  ownerName: string;
  phoneNumber: string;
  imei: string;
  lossLocation: string;
  lossTime: string;
  phoneImage: string | File | null;
  reportImage: string | File | null;
  password: string;
  confirmPassword: string;
  idLast6: string; // آخر 6 أرقام من البطاقة
}

type ImageType = 'phoneImage' | 'reportImage';


// دوال مساعدة لتنسيق عرض البيانات
const maskName = (name: string): string => {
  if (!name) return '';

  // تقسيم الاسم إلى كلمات
  const words = name.trim().split(/\s+/);

  // معالجة كل كلمة - النجوم أولاً والحرف الأول في النهاية
  const maskedWords = words.map(word => {
    if (word.length <= 1) return word;
    // 6 نجوم متبوعة بالحرف الأول من الكلمة
    return '******' + word.charAt(0);
  });

  // إعادة تجميع الكلمات بالترتيب الأصلي مع فاصل واحد بين الأسماء
  return maskedWords.join(' ');  // مسافة واحدة بين كل اسم
};

const maskPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // إزالة أي أحرف غير رقمية
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length <= 2) return cleanPhone;

  // الحصول على آخر رقمين
  const lastTwoDigits = cleanPhone.slice(-2);

  // إظهار الرقمين أولاً ثم النجوم (بدون مسافات)
  return lastTwoDigits + '*'.repeat(Math.min(cleanPhone.length - 2, 8));
};

const maskIdNumber = (id: string): string => {
  if (!id) return '';

  // إزالة أي أحرف غير رقمية
  const cleanId = id.replace(/\D/g, '');

  if (cleanId.length <= 4) return cleanId;

  // الحصول على آخر 4 أرقام
  const lastFourDigits = cleanId.slice(-4);

  // إظهار الأرقام أولاً ثم النجوم (بدون مسافات) - مثل صفحة الشراء
  return lastFourDigits + '*'.repeat(Math.min(cleanId.length - 4, 6));
};

const maskEmail = (email: string | null): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '***'; // صيغة بريد إلكتروني غير صالحة

  const [localPart, domain] = parts;

  if (localPart.length <= 3) {
    return `${localPart.charAt(0)}**@${domain}`;
  }
  return `${localPart.substring(0, 3)}***@${domain}`;
};

const ReportPhone: React.FC = () => {
  useScrollToTop();
  // حالة لتخزين القيم الأصلية
  const [originalData, setOriginalData] = useState({
    ownerName: '',
    phoneNumber: '',
    idLast6: ''
  });
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth(); // جلب المستخدم الحالي

const [formData, setFormData] = useState<FormData>({
  ownerName: '',
  phoneNumber: '',
  imei: '',
  lossLocation: '',
  lossTime: '',
  phoneImage: null,
  reportImage: null,
  password: '',
  confirmPassword: '',
  idLast6: '',
});

  // حالة المعاينة للصور (Data URL أو مسار ملف)
  const [phoneImagePreview, setPhoneImagePreview] = useState<string | null>(null);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);

  // حالة لتتبع ما إذا كان النموذج للقراءة فقط بشكل كامل
  const [isReadOnly, setIsReadOnly] = useState(false);
  // حالة لتتبع الحقول التي يجب أن تكون للقراءة فقط بشكل انتقائي
  const [fieldReadOnlyState, setFieldReadOnlyState] = useState({
    ownerName: false,
    phoneNumber: false,
    lossLocation: false,
    lossTime: false,
    phoneImage: false,
    reportImage: false,
  });

  // حالة التحميل والإرسال
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حالة لتتبع ما إذا كان IMEI مسجلاً مسبقاً
  const [isImeiRegistered, setIsImeiRegistered] = useState(false);

  const [dbPassword, setDbPassword] = useState<string | null>(null); // لتخزين كلمة المرور من قاعدة البيانات للتحقق
  const [registeredPhoneEmail, setRegisteredPhoneEmail] = useState<string | null>(null); // لتخزين إيميل الهاتف المسجل
  // حالة نافذة كلمة المرور المنبثقة
  const [modalPassword, setModalPassword] = useState('');
  const [modalConfirmPassword, setModalConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // حالة الإعلان المتحرك
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // حالة لعرض رسالة تحذير إذا كان هناك بلاغ فعال موجود
  const [activeReportWarning, setActiveReportWarning] = useState<string | null>(null);

  // Refs لعناصر إدخال الملفات
  const phoneImageInputRef = React.useRef<HTMLInputElement>(null);
  const reportImageInputRef = React.useRef<HTMLInputElement>(null);

  // دالة موحدة للتحقق من صحة الحقول
  const validateForm = (data: FormData, isImeiRegisteredStatus: boolean, actualDbPassword: string | null, currentFieldReadOnlyState: typeof fieldReadOnlyState): boolean => {
  // التحقق من الحقول المطلوبة
  if (!data.ownerName || !data.phoneNumber || !data.imei || !data.lossLocation || !data.lossTime || !data.idLast6) {
    toast({ title: t('error'), description: t('please_fill_all_fields'), variant: 'destructive' });
    return false;
  }
  // تحقق من صحة آخر 6 أرقام
  // إذا كان الهاتف مسجل مسبقاً، نتخطى التحقق لأن البيانات موجودة في originalData
  if (!isImeiRegisteredStatus) {
    if (!data.idLast6 || data.idLast6.length !== 6 || !/^\d{6}$/.test(data.idLast6)) {
      toast({ title: t('error'), description: t('id_last6_invalid') || 'يجب إدخال آخر 6 أرقام من البطاقة بشكل صحيح', variant: 'destructive' });
      return false;
    }
  }

  // التحقق من كلمة المرور للهواتف المسجلة
  if (isImeiRegisteredStatus) {
    // إذا كان IMEI مسجلاً، يجب إدخال كلمة المرور في الحقل الرئيسي للتحقق
    if (!data.password) {
      toast({ title: t('error'), description: t('please_enter_password_to_confirm'), variant: 'destructive' });
      return false;
    }
    if (data.password !== actualDbPassword) {
      toast({ title: t('error'), description: t('invalid_password'), variant: 'destructive' });
      return false;
    }
  }
  // التحقق من الصور المطلوبة
  // صورة الهاتف مطلوبة إذا كان الحقل قابلاً للتعديل (أي يُتوقع تحميلها)
  if (!currentFieldReadOnlyState.phoneImage && !data.phoneImage) {
    toast({ title: t('error'), description: t('phone_image_required'), variant: 'destructive' }); // قد تحتاج لإضافة مفتاح الترجمة هذا
    return false;
  }
  // صورة المحضر مطلوبة إذا كان الحقل قابلاً للتعديل
  if (!currentFieldReadOnlyState.reportImage && !data.reportImage) {
    toast({ title: t('error'), description: t('report_image_required'), variant: 'destructive' }); // قد تحتاج لإضافة مفتاح الترجمة هذا
    return false;
  }

  return true;
  };


  const handleForgotPassword = async () => {
    if (!isImeiRegistered) {
      // This case should ideally not be reachable if the button is only shown when an IMEI is registered.
      toast({ title: t('error'), description: t('enter_imei_first'), variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: t('error'), description: t('must_be_logged_in'), variant: 'destructive' });
      return;
    }

    // The email of the registered phone is already in the `registeredPhoneEmail` state from the initial check.
    if (registeredPhoneEmail === user.email) {
      navigate('/reset-register', { state: { imei: formData.imei } });
    } else {
      toast({
        title: t('access_denied', { defaultValue: 'وصول مرفوض' }),
        description: `هذا الهاتف غير مسجل بهذا الحساب. البريد الإلكتروني المسجل هو: ${maskEmail(registeredPhoneEmail)}`,
        variant: 'destructive',
      });
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'idLast6' ? value.replace(/\D/g, '') : value;
    setFormData(prev => ({
      ...prev,
      [name]: updatedValue
    }));
  };

  const updateImage = useCallback(async (file: File, fileType: ImageType, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    // Show preview immediately
    setPreview(URL.createObjectURL(file));

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg', // تغيير إلى JPEG
    };

    try {
        toast({ description: t('compressing_image') });
        const compressedFile = await imageCompression(file, options);
        
        // تحويل الملف المضغوط إلى Blob ثم إلى File
        const compressedBlob = await fetch(URL.createObjectURL(compressedFile)).then(r => r.blob());
        const finalFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
        
        setFormData(prev => ({ ...prev, [fileType]: finalFile }));
        toast({ title: t('success'), description: t('image_compressed_successfully') });
    } catch (error) {
        console.error('Image compression error:', error);
        toast({ title: t('error'), description: t('image_compression_failed'), variant: 'destructive' });
        setFormData(prev => ({ ...prev, [fileType]: file })); // Fallback to original file
    }
  }, [t, toast]);

  // دالة لالتقاط الصورة باستخدام الكاميرا
  const startCamera = useCallback(async (fileType: ImageType, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (fieldReadOnlyState[fileType] || isReadOnly) return;

    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const fileName = `captured_${fileType}_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        await updateImage(file, fileType, setPreview);
      } else {
         setFormData(prev => ({ ...prev, [fileType]: null }));
         setPreview(null);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast({ title: t('error'), description: t('failed_to_take_photo'), variant: 'destructive' });
    }
  }, [fieldReadOnlyState, isReadOnly, toast, t, updateImage]);

  // دالة لاختيار صورة من المعرض/الملفات
  const handleImageFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, fileType: ImageType, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (fieldReadOnlyState[fileType] || isReadOnly) return;

    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: t('error'), description: t('file_too_large_10mb'), variant: 'destructive' });
        return;
      }
      await updateImage(file, fileType, setPreview);
    } else {
      setFormData(prev => ({ ...prev, [fileType]: null }));
      setPreview(null);
    }
  }, [fieldReadOnlyState, isReadOnly, toast, t, updateImage]);

  // دالة مساعدة لعرض حقول تحميل الصور
  const renderImageUpload = (
    label: string,
    fileType: ImageType,
    preview: string | null,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    Icon: React.ElementType,
    UploadIcon: React.ElementType,
    config: { showCaptureButton: boolean; showUploadButton: boolean },
    inputRef: React.RefObject<HTMLInputElement> // إضافة Ref كمعامل
  ) => {
    const isFieldReadOnly = fieldReadOnlyState[fileType] || isReadOnly;

    return (
      <div key={fileType} className="p-4 border border-gray-700 rounded-md bg-gray-800 space-y-3">
        <label className="text-white font-medium text-lg max-w-[320px]">{label}</label>
          {config.showUploadButton && !isFieldReadOnly && (
              <><input
            type="file"
            ref={inputRef} // استخدام الـ Ref هنا
            accept="image/*"
            onChange={(e) => handleImageFileChange(e, fileType, setPreview)}
            className="hidden"
            disabled={isFieldReadOnly || isLoading || isSubmitting} /><Button
              type="button"
              onClick={() => inputRef.current?.click()} // استخدام الـ Ref للنقر
              disabled={isFieldReadOnly || isLoading || isSubmitting}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white w-full justify-center"
            >
              <UploadIcon className="w-5 h-5" />
              <span>{t('upload_image')}</span>
            </Button></>
          )}
          {config.showCaptureButton && !isFieldReadOnly && (
             <Button
              type="button"
              onClick={() => startCamera(fileType, setPreview)}
              disabled={isFieldReadOnly || isLoading || isSubmitting}
              className="flex items-center space-x-2 bg-cyan-400 hover:bg-cyan-300 text-white w-full justify-center shadow-lg shadow-cyan-400/50 animate-pulse"
            >
              <Camera className="w-5 h-5" />
              <span>{t('take_photo')}</span>
            </Button>
          )}
        {preview && (
          <div className="mt-3">
            <img src={preview} alt={`${label} Preview`} className="max-w-xs h-auto rounded-md border border-gray-600" />
          </div>
        )}
      </div>
    );
  };


  // تأثير لتحميل البيانات عند تغيير IMEI
  // تعديل دالة التحقق من IMEI
const initialFormDataRef = React.useRef({
  ownerName: '',
  phoneNumber: '',
  imei: '',
  lossLocation: '',
  lossTime: '',
  phoneImage: null,
  reportImage: null,
  password: '',
  confirmPassword: ''
}); // Use ref to avoid recreation

  useEffect(() => {
    const imeiValue = formData.imei.trim();

    const resetFormForNewReport = () => {
      setPhoneImagePreview(null);
      setReportImagePreview(null);
      setFieldReadOnlyState({
        ownerName: false, phoneNumber: false, lossLocation: false, lossTime: false,
        phoneImage: false, reportImage: false,
      });
      setIsImeiRegistered(false);
      setDbPassword(null);
      setRegisteredPhoneEmail(null); // إعادة تعيين الإيميل
      setFormData(prev => ({
        ...initialFormDataRef.current,
        imei: prev.imei, // Keep current IMEI
        password: '',
        confirmPassword: '',
        idLast6: '',
      }));
      setIsReadOnly(false);
      setActiveReportWarning(null); // إعادة تعيين رسالة التحذير
    };

    const fetchDataForImei = async () => {
      resetFormForNewReport(); // Reset first

      if (imeiValue.length === 15) {
        setIsLoading(true);
        try {
          // الخطوة 1: التحقق مما إذا كان الهاتف مبلغ عنه بالفعل كـ "مفقود" (فعال)
          const { data: existingActiveReport } = await supabase
            .from('phone_reports')
            .select('imei, owner_name, phone_number, phone_image_url, report_image_url, loss_location, loss_time')
            .eq('imei', imeiValue)
            .eq('status', 'active') // تحقق من البلاغات الفعالة فقط
            .maybeSingle();


          if (existingActiveReport) {
            toast({ title: t('error'), description: t('imei_already_reported_as_lost'), variant: 'destructive' });
            setIsReadOnly(true); // جعل كل الحقول للقراءة فقط
            setFormData(prev => ({
              ...prev,
              ownerName: maskName(existingActiveReport.owner_name) || '',
              phoneNumber: maskPhoneNumber(existingActiveReport.phone_number) || '',
              lossLocation: existingActiveReport.loss_location || '',
              lossTime: existingActiveReport.loss_time || '',
              phoneImage: existingActiveReport.phone_image_url || null,
              reportImage: existingActiveReport.report_image_url || null,
            }));
            setPhoneImagePreview(existingActiveReport.phone_image_url || null);
            setReportImagePreview(existingActiveReport.report_image_url || null);
            setFieldReadOnlyState({
              ownerName: true, phoneNumber: true, lossLocation: true, lossTime: true,
              phoneImage: true, reportImage: true,
            });
            setIsImeiRegistered(true); // اعتبره "معالجًا" أو "مسجلاً" في سياق الإبلاغ
            setActiveReportWarning(t('imei_already_reported_as_lost_detail')); // تعيين رسالة التحذير
            setIsLoading(false);
            return; // إيقاف المعالجة الإضافية
          }

          // الخطوة 2: إذا لم يكن مبلغًا عنه كـ "فعال"، تحقق من جدول `registered_phones`
          const { data: registeredPhone, error: regDbError } = await supabase
            .from('registered_phones')
            .select('owner_name, phone_number, phone_image_url, password, id_last6, email, user_id') // إضافة email
            .eq('imei', imeiValue)
            .maybeSingle();

          if (regDbError) {
            console.error('Error fetching registered phone from Supabase:', regDbError);
            toast({ title: t('error'), description: t('error_checking_imei'), variant: 'destructive' });
            setIsLoading(false);
            return;
          }

          if (registeredPhone) {
            setIsImeiRegistered(true);
            setDbPassword(registeredPhone.password || null); // حفظ كلمة المرور للتحقق لاحقًا
            setRegisteredPhoneEmail(registeredPhone.email || null); // حفظ الإيميل للتحقق
            
            // حفظ البيانات الأصلية
            setOriginalData({
              ownerName: registeredPhone.owner_name || '',
              phoneNumber: registeredPhone.phone_number || '',
              idLast6: registeredPhone.id_last6 || ''
            });

            // عرض البيانات المقنعة في النموذج
            setFormData(prev => ({
              ...prev,
              ownerName: maskName(registeredPhone.owner_name) || '',
              phoneNumber: maskPhoneNumber(registeredPhone.phone_number) || '',
              idLast6: registeredPhone.id_last6 ? maskIdNumber(registeredPhone.id_last6) : '',
              phoneImage: registeredPhone.phone_image_url || null,
            }));

            setPhoneImagePreview(registeredPhone.phone_image_url || null);

            setFieldReadOnlyState({
              ownerName: true,
              phoneNumber: true,
              lossLocation: false,
              lossTime: false,
              phoneImage: !!registeredPhone.phone_image_url,
              reportImage: false,
            });
            toast({ title: t('info'), description: t('phone_already_registered_report_if_lost') });
          } else {
            // IMEI غير موجود في registered_phones ولم يتم الإبلاغ عنه كـ "فعال"
            setIsImeiRegistered(false);
            // النموذج معاد تعيينه بالفعل وجاهز لتقرير جديد
          }
        } catch (error) {
          console.error('Error in fetchDataForImei:', error);
          toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
      } else {
        resetFormForNewReport(); // Reset if IMEI is not 15 digits
      }
    };

    fetchDataForImei();
  }, [formData.imei, t, toast]);

  // تعديل دالة معالجة الإرسال
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // التحقق من صحة النموذج مع تمرير حالة القراءة فقط للحقول
  if (!validateForm(formData, isImeiRegistered, dbPassword, fieldReadOnlyState)) {
    return;
  }

  // ذا كان IMEI غير مسجل، اعرض نافذة كلمة المرور المنبثقة
  if (!isImeiRegistered) {
    setShowPasswordModal(true);
    return;
  }

  // ذا كان IMEI مسجلاً، تابع مباشرة مع كلمة المرور الموجودة في formData
  // تأكد من أن كلمة المرور تم التحقق منها بالفعل في validateForm
  await saveReport(formData.password);
  };

  // دالة معالجة إرسال النافذة المنبثقة لكلمة المرور
  const handleModalSubmit = async () => {
    // التحقق من تطابق كلمات المرور في النافذة المنبثقة
    if (!modalPassword || !modalConfirmPassword || modalPassword !== modalConfirmPassword) {
      toast({ title: t('error'), description: t('passwords_do_not_match'), variant: 'destructive' });
      return;
    }

    // استدعاء دالة حفظ البلاغ مع كلمة المرور من النافذة المنبثقة
    await saveReport(modalPassword);

    // إغلاق النافذة المنبثقة (سيتم إغلاقها أيضاً في saveReport عند النجاح، ولكن هذا يضمن الإغلاق حتى لو لم يتم الانتقال للصفحة)
    setShowPasswordModal(false);
  };


  // دالة لحفظ البلاغ (تحتاج إلى إضافة المنطق الفعلي هنا)
  const saveReport = async (password: string) => {
    setIsSubmitting(true);
    try {
      // 1. رفع الصور إذا كانت من نوع File
      let phoneImageUrlToSave = formData.phoneImage;
      if (formData.phoneImage instanceof File) {
        // إنشاء اسم فريد للملف
        const timeStamp = Date.now();
        const phoneFileName = `phones/${formData.imei}_phone_${timeStamp}.jpg`;
        
        try {
          // رفع صورة الهاتف
          const { error: phoneUploadError } = await supabase.storage
            .from('phoneimages')
            .upload(phoneFileName, formData.phoneImage, {
              cacheControl: '3600',
              contentType: 'image/jpeg',
              upsert: false
            });

          if (phoneUploadError) throw phoneUploadError;

          // الحصول على الرابط العام
          const { data: phoneUrlData } = supabase.storage
            .from('phoneimages')
            .getPublicUrl(phoneFileName);

          phoneImageUrlToSave = phoneUrlData.publicUrl;
          console.log('Phone image uploaded successfully:', phoneImageUrlToSave);
        } catch (error) {
          console.error('Error uploading phone image:', error);
          toast({ title: t('error'), description: t('error_uploading_phone_image'), variant: 'destructive' });
          throw error;
        }
      }

      // رفع صورة المحضر
      let reportImageUrlToSave = formData.reportImage;
      if (formData.reportImage instanceof File) {
        // إنشاء اسم فريد للملف
        const timeStamp = Date.now();
        const reportFileName = `${formData.imei}_report_${timeStamp}.jpg`;
        
        try {
          // رفع صورة المحضر داخل مجلد reports/
          const reportFile = formData.reportImage;
          if (!(reportFile instanceof File)) {
            throw new Error('Invalid report image file');
          }

          const { error: reportUploadError } = await supabase.storage
            .from('phoneimages')
            .upload(`reports/${reportFileName}`, reportFile, {
              cacheControl: '3600',
              contentType: 'image/jpeg',
              upsert: true // السماح بالتحديث إذا كان الملف موجوداً
            });

          if (reportUploadError) {
            console.error('Report upload error:', reportUploadError);
            throw reportUploadError;
          }

          // الحصول على الرابط العام من خلال API المخصص
          const { data: reportUrlData } = supabase.storage
            .from('phoneimages')
            .getPublicUrl(`reports/${reportFileName}`);

          if (!reportUrlData.publicUrl) {
            throw new Error('Could not get public URL for report image');
          }

          // حفظ الرابط العام
          reportImageUrlToSave = reportUrlData.publicUrl;
          console.log('Report saved at:', reportUrlData.publicUrl);
          console.log('Report image uploaded successfully:', reportImageUrlToSave);
        } catch (error) {
          console.error('Error uploading report image:', error);
          toast({ title: t('error'), description: t('error_uploading_report_image'), variant: 'destructive' });
          throw error;
        }
      }

      // 2. تجهيز بيانات البلاغ للحفظ في Supabase
      const reportDataToSave = {
        owner_name: isImeiRegistered ? originalData.ownerName : formData.ownerName,
        phone_number: isImeiRegistered ? originalData.phoneNumber : formData.phoneNumber,
        imei: formData.imei,
        loss_location: formData.lossLocation,
        loss_time: formData.lossTime,
        id_last6: isImeiRegistered ? originalData.idLast6 : formData.idLast6, // استخدام البيانات الأصلية إذا كان الهاتف مسجلاً
        password: password, // Password that was verified or set
        phone_image_url: phoneImageUrlToSave,
        report_image_url: reportImageUrlToSave,
        report_date: new Date().toISOString(),
        status: 'active', // البلاغ الجديد يكون دائمًا فعالاً
        user_id: user?.id || null, // إضافة user_id للربط مع المستخدم
      };

      const { data: insertResult, error: insertError } = await supabase.from('phone_reports').insert([reportDataToSave]).select();
      if (insertError) throw insertError;

      // إضافة البلاغ الجديد إلى localStorage ليظهر في الإشعارات
      const savedReportsStr = localStorage.getItem('phoneReports') || '[]';
      const savedReports = JSON.parse(savedReportsStr);
      // الحصول على id من Supabase إذا توفر
      const newId = insertResult && insertResult[0] && insertResult[0].id ? insertResult[0].id : Date.now();
      savedReports.push({
        id: newId,
        imei: formData.imei,
        ownerName: formData.ownerName,
        phoneNumber: formData.phoneNumber,
        lossLocation: formData.lossLocation,
        lossTime: formData.lossTime,
        reportDate: new Date().toISOString(),
        status: 'active',
        password: formData.password,
      });
      localStorage.setItem('phoneReports', JSON.stringify(savedReports));
      window.dispatchEvent(new Event('localStorageChange'));

      toast({ title: t('success'), description: t('report_submitted_successfully') });
      setIsReadOnly(true);
      setFieldReadOnlyState({
          ownerName: true, phoneNumber: true, lossLocation: true, lossTime: true,
          phoneImage: true, reportImage: true
      });
      // الانتظار ثانيتين ثم الانتقال إلى لوحة التحكم
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error saving report:', error);
      toast({ title: t('error'), description: t('failed_to_submit_report'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setShowPasswordModal(false); // إغلاق النافذة المنبثقة بعد المحاولة
    }
  };


  return (
    <PageContainer>
      <AppNavbar />
      <PageAdvertisement pageName="reportphone" />
      {/* زر الرجوع والعنوان معاً في div واحد لإضافة مسافة بينهما وإزاحة العنوان لليسار */}
      <div className="flex items-center mb-6 gap-20">
        <BackButton className="mr-8" />
        <h1 className="text-2xl font-bold text-white">{t('report_lost_phone')}</h1>
      </div>

      {/* نموذج الإبلاغ */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* حقول النموذج */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="imei" className="block text-white font-medium mb-1">{t('imei_number')}</label>
            <Input
              type="text"
              id="imei"
              name="imei"
              value={formData.imei}
              onChange={handleChange}
              placeholder={t('enter_imei')}
              disabled={isReadOnly || isLoading || isSubmitting}
              className="w-full"
            />
            <p className="text-sm text-gray-400">{t('imei_hint')}</p>
          </div>
          
          {/* عرض رسالة التحذير إذا كان هناك بلاغ فعال موجود */}
          {activeReportWarning && (
            <div className="my-4 p-4 bg-red-900 bg-opacity-70 border border-red-600 rounded-lg text-center flex flex-col items-center space-y-3 shadow-lg">
              <AlertTriangle className="w-12 h-12 text-red-400" />
              <p className="text-red-200 font-semibold text-lg">{activeReportWarning}</p>
            </div>
          )}

          {/* حقل اسم المالك */}
          <div className="space-y-2">
            <label htmlFor="ownerName" className="block text-white font-medium mb-1">{t('owner_name')}</label>
            <Input
              type="text"
              id="ownerName"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder={t('owner_name')}
              disabled={isReadOnly || fieldReadOnlyState.ownerName || isLoading || isSubmitting}
              className="w-full"
            />
         {/* حقل رقم البطاقة (آخر 6 أرقام) */}
         <div>
           <label htmlFor="idLast6" className="block text-white font-medium mb-1">آخر 6 أرقام من البطاقة الشخصية</label>
           <Input
             type="text"
             id="idLast6"
             name="idLast6"
             value={formData.idLast6}
             onChange={handleChange}
             className="w-full"
             maxLength={6}
             pattern="[0-9]{6}"
             inputMode="numeric"
             required
             placeholder={'أدخل آخر 6 أرقام من البطاقة'}
             disabled={isImeiRegistered || isReadOnly || isLoading || isSubmitting}
           />
         </div>
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-white font-medium mb-1">{t('phone_number')}</label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="text"
              value={formData.phoneNumber}
              onChange={handleChange}
              disabled={fieldReadOnlyState.phoneNumber || isReadOnly || isLoading || isSubmitting}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="lossLocation" className="block text-white font-medium mb-1">{t('loss_location')}</label>
            <Input
              id="lossLocation"
              name="lossLocation"
              type="text"
              value={formData.lossLocation}
              onChange={handleChange}
              disabled={fieldReadOnlyState.lossLocation || isReadOnly || isLoading || isSubmitting}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="lossTime" className="block text-white font-medium mb-1">{t('loss_time')}</label>
            <Input
              id="lossTime"
              name="lossTime"
              type="datetime-local" // استخدام نوع datetime-local لاختيار التاريخ والوقت
              value={formData.lossTime}
              onChange={handleChange}
              disabled={fieldReadOnlyState.lossTime || isReadOnly || isLoading || isSubmitting}
              className="w-full"
            />
          </div>

          {/* حقل كلمة المرور يظهر فقط إذا كان IMEI مسجلاً بالفعل */}
          {isImeiRegistered && (
             <div>
                <label htmlFor="password" className="block text-white font-medium mb-1">{t('password')}</label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isReadOnly || isLoading || isSubmitting}
                  className="w-full"
                />
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-cyan-400 hover:text-cyan-300 mt-1 text-sm"
                  onClick={handleForgotPassword}
                  disabled={isReadOnly || isLoading || isSubmitting}
                >
                  {t('forgot_password')}
                </Button>
             </div>
          )}


          {/* أقسام تحميل الصور */}
          <div className="space-y-4">
            <h3 className="text-white text-lg font-semibold">{t('upload_images')}</h3>
            {/* تمرير true أو false للمعامل الأخير للتحكم في عرض زر الرفع */}
            {renderImageUpload(
              t('phone_image'),
              'phoneImage',
              phoneImagePreview,
              setPhoneImagePreview,
              Camera,
              Upload,
              { showCaptureButton: false, showUploadButton: !fieldReadOnlyState.phoneImage && !isReadOnly },
              phoneImageInputRef // تمرير الـ Ref
            )}
            {renderImageUpload(
              t('report_image'),
              'reportImage',
              reportImagePreview,
              setReportImagePreview,
              FileText,
              Upload,
              { showCaptureButton: !fieldReadOnlyState.reportImage && !isReadOnly, showUploadButton: !fieldReadOnlyState.reportImage && !isReadOnly },
              reportImageInputRef // تمرير الـ Ref
            )}
          </div>


          {/* زر الإبلاغ */}
          <Button
            type="submit"
            disabled={isLoading || isSubmitting || isReadOnly} // تعطيل الزر إذا كان النموذج للقراءة فقط
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 px-4 rounded"
          >
            {t('submit_report')}
          </Button>
        </div>
      </form>

      {/* نافذة كلمة المرور المنبثقة */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('set_password_for_report')}</DialogTitle>
            <DialogDescription>
              {t('set_password_for_report_description')} {/* تأكد من إضافة هذا المفتاح للترجمة */}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="modalPassword" className="text-right col-span-1">
                {t('password')}
              </label>
              <Input
                id="modalPassword"
                type="password"
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="modalConfirmPassword" className="text-right col-span-1">
                {t('confirm_password')}
              </label>
              <Input
                id="modalConfirmPassword"
                type="password"
                value={modalConfirmPassword}
                onChange={(e) => setModalConfirmPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleModalSubmit} disabled={isLoading || isSubmitting}>
               {isLoading || isSubmitting ? t('submitting') : t('submit_report')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default ReportPhone;
