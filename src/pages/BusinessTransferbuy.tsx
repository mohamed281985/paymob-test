import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, History, ArrowLeft, AlertCircle, CheckCircle, XCircle, Image as ImageIcon, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mockPhoneReports } from '../services/mockData';
import jsPDF from 'jspdf';
import { processArabicTextWithEncoding as processArabicText, loadArabicFontSafe as loadArabicFont } from '../utils/pdf/arabic-final-solution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import ImageUploader from '@/components/ImageUploader';
import { storeSellerIdForTransfer } from '../utils/sellerIdHelper';
import { Camera as CapacitorCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

// interface TransferRecord { // لم تعد هذه الواجهة مستخدمة بشكل مباشر هنا لإنشاء سجل جديد
//   id: string;
//   date: string;
//   imei: string;
//   phoneType: string;
//   seller: {
//     name: string;
//     phone: string;
//     idImage: string;
//     selfie: string;
//   };
//   buyer: {
//     name: string;
//     phone: string;
//     idImage: string;
//     selfie: string;
//   };
//   receiptImage: string;
//   phoneImage: string;
// }

// دوال مساعدة لإخفاء البيانات الحساسة

// إخفاء الاسم: وضع النجوم أولاً والحرف الأول في النهاية
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

  // إعادة تجميع الكلمات بالترتيب الأصلي
  return maskedWords.join(' ');
};

// إخفاء رقم الهاتف: إظهار آخر رقمين أولاً ثم النجوم
const maskPhone = (phone: string): string => {
  if (!phone) return '';

  // إزالة أي أحرف غير رقمية
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length <= 2) return cleanPhone;

  // الحصول على آخر رقمين
  const lastTwoDigits = cleanPhone.slice(-2);

  // إظهار الرقمين أولاً ثم النجوم (بدون مسافات)
  return lastTwoDigits + '*'.repeat(Math.min(cleanPhone.length - 2, 8));
};

// إخفاء رقم البطاقة: إظهار آخر 4 أرقام أولاً ثم النجوم
const maskIdNumber = (idNumber: string): string => {
  if (!idNumber) return '';

  // إزالة أي أحرف غير رقمية
  const cleanId = idNumber.replace(/\D/g, '');

  if (cleanId.length <= 4) return cleanId;

  // الحصول على آخر 4 أرقام
  const lastFourDigits = cleanId.slice(-4);

  // إظهار الأرقام أولاً ثم النجوم (بدون مسافات)
  return lastFourDigits + '*'.repeat(Math.min(cleanId.length - 4, 6));
};

const BusinessTransferBuy: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentSelfieType, setCurrentSelfieType] = useState<'seller' | 'buyer' | 'sellerId' | 'buyerId' | 'receipt' | null>(null);
  const { user } = useAuth(); // استخدام hook useAuth
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [debouncedImei, setDebouncedImei] = useState('');

  const [imei, setImei] = useState('');
  const [phoneType, setPhoneType] = useState('');
  const [phoneImage, setPhoneImage] = useState<string>('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerIdLast6, setSellerIdLast6] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paid, setPaid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPhoneReported, setIsPhoneReported] = useState<boolean | null>(null);

  // الاسم المقنع للبائع للعرض
  const maskedSellerName = maskName(sellerName);
  // رقم الهاتف المقنع للبائع للعرض
  const maskedSellerPhone = maskPhone(sellerPhone);
  // رقم البطاقة المقنع للبائع للعرض
  const maskedSellerId = maskIdNumber(sellerIdLast6);

  // Image states for the current transaction
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [originalReceiptImage, setOriginalReceiptImage] = useState<string>('');

  const [formData, setFormData] = useState({
    ownerName: '',
    phoneNumber: '',
    imei: '',
    lossLocation: '',
    lossTime: '',
    phoneImage: null as File | null,
    reportImage: null as File | null,
    idImage: null as File | null,
    selfieImage: null as File | null,
    password: ''
  });

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sellerPassword, setSellerPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhoneReport, setCurrentPhoneReport] = useState<any>(null); // لتخزين بلاغ الهاتف الحالي

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setImage: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = (type: 'seller' | 'buyer' | 'sellerId' | 'buyerId' | 'receipt') => {
    setCurrentSelfieType(type);
    setIsCameraOpen(true);

    // استخدام الكاميرا الخلفية لصورة الفاتورة والأمامية للسيلفي
    const facingMode = type === 'receipt' ? 'environment' : 'user';

    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      } 
    })
    .then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // التشغيل التلقائي بمجرد جاهزية التدفق
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
    })
    .catch((err) => {
      console.error("Camera error:", err);
      toast({
        title: t('camera_error') || 'خطأ في الكاميرا',
        description: t('camera_permission_required') || 'يرجى السماح باستخدام الكاميرا',
        variant: 'destructive'
      });
    });
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      try {
        const canvas = document.createElement('canvas');
        // الحفاظ على نسبة العرض إلى الارتفاع للفيديو
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // رسم الإطار الحالي على الكانفاس
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // تحويل الكانفاس إلى صورة بتنسيق JPEG عالي الجودة
          const imageData = canvas.toDataURL('image/jpeg', 0.9);

          // تعيين الصورة حسب النوع
          if (currentSelfieType === 'receipt') {
            setReceiptImage(imageData);
            toast({
              title: t('success') || 'تم بنجاح',
              description: t('receipt_captured') || 'تم التقاط صورة الفاتورة بنجاح',
              variant: 'default'
            });
          }
          closeCamera();
        }
      } catch (error) {
        console.error("Error capturing image:", error);
        toast({
          title: t('capture_error') || 'خطأ في التقاط الصورة',
          description: t('try_again') || 'يرجى المحاولة مرة أخرى',
          variant: 'destructive'
        });
      }
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      // إيقاف جميع المسارات
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    setCurrentSelfieType(null);
  };

  const handlePayment = () => {
    setPaid(true);
    toast({
      title: t('payment_success') || 'تم الدفع بنجاح',
      description: t('you_can_now_transfer') || 'يمكنك الآن نقل الملكية.'
    });
  };

  // تحديث حالة IMEI فقط عند الإدخال
  const handleImeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setImei(value);
  };

  // تأثير لتأخير التحقق من IMEI (Debouncing)
  useEffect(() => {
    // مسح البيانات السابقة عند كل تغيير في IMEI
    setSellerName('');
    setSellerPhone('');
    setSellerIdLast6('');
    setPhoneType('');
    setPhoneImage('');
    setOriginalReceiptImage('');
    setIsPhoneReported(null);
    setShowRegisterDialog(false); // إخفاء الحوار عند الإدخال الجديد

    const handler = setTimeout(() => {
      if (imei.length === 15) {
        setDebouncedImei(imei);
      } else {
        setDebouncedImei(''); // مسح القيمة المؤجلة إذا لم يكن الطول 15
      }
    }, 800); // تأخير 800 مللي ثانية

    // دالة التنظيف لإلغاء المؤقت إذا قام المستخدم بالكتابة مرة أخرى
    return () => {
      clearTimeout(handler);
    };
  }, [imei]);

  // تأثير لجلب البيانات بناءً على IMEI المؤجل
  useEffect(() => {
    // لا تقم بأي شيء إذا كانت القيمة المؤجلة فارغة
    if (!debouncedImei) {
      setIsLoading(false); // تأكد من إيقاف التحميل
      return;
    }

      const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. التحقق من وجود بلاغ فعال
        const { count: reportCount, error: reportError } = await supabase
          .from('phone_reports')
          .select('*', { count: 'exact', head: true })
          .eq('imei', debouncedImei)
          .eq('status', 'active');

        if (reportError) throw reportError;

        const isReported = (reportCount ?? 0) > 0;
        setIsPhoneReported(isReported);

        if (isReported) {
          toast({ title: t('warning'), description: t('phone_is_reported_as_lost'), variant: 'destructive' });
          return; // التوقف إذا كان هناك بلاغ
        }

        // 2. التحقق مما إذا كان الهاتف مسجلاً
        const { data: registeredPhone, error: regError } = await supabase
          .from('registered_phones')
          .select('owner_name, phone_number, phone_type, phone_image_url, receipt_image_url, id_last6')
          .eq('imei', debouncedImei)
          .maybeSingle();

        if (regError) throw regError;

        if (registeredPhone) {
          // التحقق مما إذا كان الهاتف مسجل باسم المستخدم التجاري الحالي
          // نتحقق مما إذا كان الهاتف مملوك للمستخدم الحالي بناءً على الاسم ورقم الهاتف
          if (user?.role === 'business' && registeredPhone.owner_name === buyerName && registeredPhone.phone_number === buyerPhone) {
            // عرض إشعار في مربع أحمر
            toast({ 
              title: 'تنبيه', 
              description: 'هذا الهاتف مسجل لديك بالفعل!', 
              variant: 'destructive',
              className: 'bg-red-100 border-2 border-red-500 text-red-800 font-bold rtl' 
            });
            // إعادة تعيين حقول الإدخال
            setImei('');
            setSellerName('');
            setSellerPhone('');
            setSellerIdLast6('');
            setPhoneType('');
            setPhoneImage('');
            setOriginalReceiptImage('');
            setIsPhoneReported(null);
            setIsLoading(false);
            return; // التوقف إذا كان الهاتف مسجل للمستخدم الحالي
          }

          // الهاتف مسجل لشخص آخر, املأ البيانات
          setSellerName(registeredPhone.owner_name || '');
          setSellerPhone(registeredPhone.phone_number || '');
          setSellerIdLast6(registeredPhone.id_last6 || '');
          setPhoneType(registeredPhone.phone_type || '');
          setPhoneImage(registeredPhone.phone_image_url || '');
          setOriginalReceiptImage(registeredPhone.receipt_image_url || '');
          // toast({ title: t('success'), description: t('owner_data_loaded') });
        } else {
          // الهاتف غير مسجل, أظهر النافذة المنبثقة
          setShowRegisterDialog(true);
        }
      } catch (error) {
        console.error("Error fetching data for IMEI:", error);
        toast({ title: t('error'), description: t('error_fetching_data'), variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
      };
      fetchData();
  }, [debouncedImei, t, toast, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!imei || !buyerName || !buyerPhone || !sellerName) { // التأكد من وجود اسم البائع أيضاً
        toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // البحث عن الهاتف في قاعدة بيانات registered_phones
      const { data: phone, error: fetchError } = await supabase
        .from('registered_phones')
        .select('*')
        .eq('imei', imei)
        .single(); // يفترض وجود هاتف واحد بهذا IMEI

      if (fetchError || !phone) {
        toast({ title: 'خطأ', description: 'لم يتم العثور على الهاتف في قاعدة البيانات للتسجيل الأولي', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // تعديل هنا: استخدام Dialog بدلاً من prompt للتهنئة وطلب كلمة المرور
      // نقوم بإظهار Dialog مخصضص بدلاً من استخدام prompt
      setShowPasswordDialog(true);
      setIsLoading(false);
      return;
      
      // تم نقل الكود التالي إلى دالة handlePasswordSubmit
    } catch (error) {
      console.error("Error during ownership transfer:", error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء معالجة الطلب', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // تعديل دالة handlePasswordSubmit لتتضمن منطق نقل الملكية
  const handlePasswordSubmit = async () => { // This function now handles the entire transfer confirmation logic
    setIsLoading(true);
    try {
      // 1. التحقق من صحة المدخلات في مربع الحوار
      if (!sellerPassword) {
        toast({ 
          title: 'كلمة المرور مطلوبة', 
          description: 'يرجى إدخال كلمة مرور البائع الحالية', 
          variant: 'destructive',
          className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500' 
        });
        setIsLoading(false);
        return;
      }
      if (!newPassword) {
        toast({ 
          title: 'كلمة المرور مطلوبة', 
          description: 'يرجى إدخال كلمة مرور للمشتري الجديد', 
          variant: 'destructive',
          className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500' 
        });
        setIsLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        toast({ 
          title: 'كلمة المرور قصيرة', 
          description: 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل', 
          variant: 'destructive',
          className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500' 
        });
        setIsLoading(false);
        return;
      }

      // 2. رفع صورة الفاتورة الجديدة (إذا وجدت) - يجب أن يتم هذا قبل استدعاء الدالة
      let newReceiptImageUrl: string | null = null;
      if (receiptImage) {
        const response = await fetch(receiptImage);
        const blob = await response.blob();
        const fileName = `receipt_${imei}_${Date.now()}.jpg`;
        const imageFile = new File([blob], fileName, { type: blob.type });
        const filePath = `receipts/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('transfer-assets').upload(filePath, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('transfer-assets').getPublicUrl(filePath);
        newReceiptImageUrl = publicUrl;
      }

      // 3. استدعاء دالة قاعدة البيانات (RPC) لتنفيذ النقل بشكل آمن
      // معالجة رقم بطاقة البائع للتأكد من حفظ القيمة الحقيقية بدون نجوم
      const sellerIdValue = sellerIdLast6?.trim() || 'غير متوفر';
      
      // تسجيل مفصل لمراقبة القيم
      console.log('🔍 مراقبة البيانات قبل الحفظ:');
      console.log('- المتغير sellerIdLast6 (القيمة الأصلية):', sellerIdLast6);
      console.log('- المتغير sellerIdValue (بعد المعالجة):', sellerIdValue);
      console.log('- المتغير maskedSellerId (القيمة المقنعة للعرض):', maskIdNumber(sellerIdLast6));
      console.log('- طول القيمة الأصلية:', sellerIdLast6?.length || 0);
      console.log('- هل تحتوي على نجوم؟', sellerIdValue.includes('*'));
      
      // التأكد من عدم وجود نجوم في القيمة المراد حفظها
      if (sellerIdValue.includes('*')) {
        console.warn('⚠️ تحذير: تم اكتشاف نجوم في رقم البطاقة! سيتم استخدام القيمة الأصلية.');
        // إذا كانت تحتوي على نجوم، فهذا يعني أن هناك خطأ - يجب استخدام القيمة الأصلية
        const cleanValue = sellerIdLast6?.replace(/\*/g, '').trim() || 'غير متوفر';
        console.log('- القيمة بعد إزالة النجوم:', cleanValue);
      }
      
      console.log('✅ سيتم حفظ القيمة التالية في seller_id_last6:', sellerIdValue);
      
      // تعريف دالة لتحديث رقم بطاقة البائع يدوياً
      const updateSellerIdManually = async (imeiValue: string, sellerIdValue: string) => {
        try {
          // تأخير بسيط للتأكد من إنشاء سجل النقل
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // البحث عن آخر سجل نقل تم إنشاؤه لهذا الـ IMEI
          const { data: latestTransfer, error: fetchError } = await supabase
            .from('transfer_records')
            .select('id, created_at, imei')
            .eq('imei', imeiValue)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (!fetchError && latestTransfer) {
            console.log('تم العثور على سجل النقل:', latestTransfer);
            
            // تحديث السجل بإضافة رقم بطاقة البائع
            const { data: updateData, error: updateError } = await supabase
              .from('transfer_records')
              .update({ seller_id_last6: sellerIdValue })
              .eq('id', latestTransfer.id)
              .select();
              
            if (updateError) {
              console.error('خطأ في تحديث رقم بطاقة البائع يدوياً:', updateError);
              return false;
            } else {
              console.log('✅ تم تحديث رقم بطاقة البائع يدوياً بنجاح:', updateData);
              return true;
            }
          } else {
            console.error('لم يتم العثور على سجل النقل للتحديث اليدوي:', fetchError);
            return false;
          }
        } catch (error) {
          console.error('خطأ أثناء محاولة التحديث اليدوي:', error);
          return false;
        }
      };
      
      // المتغيرات لتخزين حالة الخطأ ومعرّف سجل النقل
      let rpcError: any = null;
      let createdTransferRecordId: number | null = null;
      
      try {
        const rpcParams: any = {
          p_imei: imei,
          p_seller_password: sellerPassword,
          p_buyer_name: buyerName,
          p_buyer_phone: buyerPhone,
          p_seller_id_last6: sellerIdValue, // إضافة رقم بطاقة البائع كمعامل
          p_new_password: newPassword,
          p_new_receipt_image_url: newReceiptImageUrl
        };

        // إذا كان المشتري مستخدمًا تجاريًا، قم بتمرير البريد الإلكتروني وتعيين رقم البطاقة إلى null
        if (user && user.role === 'business') {
          rpcParams.p_buyer_email = user.email;
          rpcParams.p_buyer_id_last6 = null;
          // إضافة تحديث إضافي لضمان إزالة id_last6 من المنتج بعد النقل
          await supabase
            .from('registered_phones')
            .update({ 
              id_last6: '',
              email: user.email
            })
            .eq('imei', imei);
        }
        
        const response = await supabase.rpc('transfer_phone_ownership', rpcParams);
        
        rpcError = response.error;
        
        // فحص إذا كان الخطأ يتعلق بعدم وجود المعامل p_seller_id_last6 في الوظيفة
        if (rpcError && rpcError.message && rpcError.message.includes('seller_id_last6')) {
          console.warn('وظيفة نقل الملكية لا تدعم معامل رقم بطاقة البائع بعد، جاري المحاولة مرة أخرى بدون هذا المعامل...');
          
          // استدعاء الوظيفة مرة أخرى بدون معامل p_seller_id_last6
          const response2 = await supabase.rpc('transfer_phone_ownership', {
            p_imei: imei,
            p_seller_password: sellerPassword,
            p_buyer_name: buyerName,
            p_buyer_phone: buyerPhone,
            p_new_password: newPassword,
            p_new_receipt_image_url: newReceiptImageUrl
          });
          
          rpcError = response2.error;
          
          // إذا نجحت المحاولة الثانية، نحاول قراءة السجل الذي تم إنشاؤه الآن لتحديده بدقة
          if (!rpcError) {
            console.log('تمت عملية نقل الملكية بنجاح (بدون رقم البطاقة)، جاري محاولة تحديد سجل النقل الذي تم إنشاؤه...');
            try {
              const { data: latestAfterRpc, error: latestAfterRpcErr } = await supabase
                .from('transfer_records')
                .select('id, created_at, imei')
                .eq('imei', imei)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (!latestAfterRpcErr && latestAfterRpc) {
                createdTransferRecordId = latestAfterRpc.id;
                console.log('📌 تم التقاط معرّف سجل النقل الذي تم إنشاؤه:', createdTransferRecordId);
              } else {
                console.warn('⚠️ لم أستطع تحديد سجل النقل المنشأ مباشرة:', latestAfterRpcErr);
              }
            } catch (captureErr) {
              console.warn('⚠️ تعذر التقاط معرف السجل مباشرة:', captureErr);
            }
          }
        }
      } catch (error) {
        console.error('خطأ غير متوقع أثناء محاولة نقل الملكية:', error);
        rpcError = error;
      }
      
      // استخدام وظيفة storeSellerIdForTransfer + تحديث مباشر باستخدام معرّف السجل لضمان الحفظ الحقيقي بدون نجوم
      if (!rpcError) {
        console.log('✅ نجحت عملية نقل الملكية، جارٍ حفظ رقم بطاقة المالك السابق في seller_id_last6...');
        const finalSellerIdValue = (sellerIdLast6 || '').replace(/\*/g, '').trim() || 'غير متوفر';

        // 1) إن كان لدينا معرّف السجل الذي تم إنشاؤه، نحدّثه مباشرة لتجاوز مشاكل اختيار آخر سجل
        if (createdTransferRecordId) {
          try {
            const { data: directUpdate, error: directUpdateErr } = await supabase
              .from('transfer_records')
              .update({ seller_id_last6: finalSellerIdValue })
              .eq('id', createdTransferRecordId)
              .select();

            if (directUpdateErr) {
              console.error('❌ فشل تحديث السجل عبر معرّفه:', directUpdateErr);
              toast({
                title: 'تحذير',
                description: 'تعذّر تحديث رقم البطاقة مباشرة عبر معرّف السجل. سيتم استخدام مسارات بديلة.',
                variant: 'destructive',
                className: 'bg-yellow-50 text-yellow-800 font-bold rtl border-2 border-yellow-500'
              });
            } else {
              console.log('✅ تم تحديث رقم البطاقة عبر معرّف السجل بنجاح:', directUpdate);
            }
          } catch (idUpdateErr) {
            console.error('❌ استثناء أثناء التحديث بمعرّف السجل:', idUpdateErr);
          }
        }

        // 2) مسار مساعد مضمون
        setTimeout(async () => {
          const success = await storeSellerIdForTransfer(imei, finalSellerIdValue);
          if (success) {
            console.log('✅ تم حفظ رقم بطاقة المالك السابق بنجاح في seller_id_last6 (مسار مساعد):', finalSellerIdValue);
          } else {
            console.error('❌ فشل حفظ رقم البطاقة (مسار مساعد)، محاولة تحديث آخر سجل مباشرة...');
            try {
              const { data: latestTransfer, error: fetchError } = await supabase
                .from('transfer_records')
                .select('id, created_at, imei, seller_id_last6')
                .eq('imei', imei)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (!fetchError && latestTransfer) {
                const { data: updateData, error: updateError } = await supabase
                  .from('transfer_records')
                  .update({ seller_id_last6: finalSellerIdValue })
                  .eq('id', latestTransfer.id)
                  .select();

                if (updateError) {
                  console.error('❌ فشل تحديث seller_id_last6 في آخر سجل نقل:', updateError);
                  // ملاحظة: إذا ظهر هذا الخطأ، فالمُرجّح أن سياسة RLS تمنع التحديث
                  toast({
                    title: 'تحقق من الصلاحيات',
                    description: 'قد تمنع سياسات RLS تحديث seller_id_last6. تحقق من Policies للسماح بالتحديث.',
                    variant: 'destructive',
                    className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
                  });
                } else {
                  console.log('✅ تم تحديث seller_id_last6 في آخر سجل نقل:', updateData);
                }
              } else {
                console.error('❌ لم يتم العثور على سجل نقل لتحديث seller_id_last6:', fetchError);
              }
            } catch (directError) {
              console.error('❌ خطأ غير متوقع أثناء تحديث seller_id_last6 في سجل النقل:', directError);
            }
          }
        }, 1800);
      }

      if (rpcError) {
        // التعامل مع الأخطاء المحددة من الدالة
        if (rpcError.message.includes('Invalid seller password')) {
            toast({ 
                title: 'كلمة المرور خاطئة', 
                description: 'كلمة مرور البائع الحالية غير صحيحة.', 
                variant: 'destructive',
                className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
            });
        } else if (rpcError.message.includes('Phone with IMEI')) {
            toast({ 
                title: 'بيانات غير موجودة', 
                description: 'لم يتم العثور على الهاتف في قاعدة البيانات.', 
                variant: 'destructive',
                className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
            });
        } else {
            // للأخطاء الأخرى
            toast({ 
                title: 'خطأ غير متوقع', 
                description: 'حدث خطأ أثناء محاولة نقل الملكية، يرجى المحاولة مرة أخرى.', 
                variant: 'destructive',
                className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
            });
            console.error(rpcError);
        }
        return; // إيقاف التنفيذ إذا كان هناك خطأ تم التعامل معه
      }

      // 4) بعد نجاح النقل: تحديث seller_id_last6 في آخر سجل نقل مباشرة لضمان ظهوره في الجدول
      try {
        const { data: latestTransferForUpdate, error: latestFetchErr } = await supabase
          .from('transfer_records')
          .select('id, created_at, imei, seller_id_last6')
          .eq('imei', imei)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!latestFetchErr && latestTransferForUpdate) {
          // استخدام القيمة الأصلية مع فحص إضافي
          let sellerIdToPersist = (sellerIdLast6 && sellerIdLast6.trim().length > 0) ? sellerIdLast6.trim() : 'غير متوفر';
          
          // فحص وإزالة أي نجوم قد تكون موجودة بطريق الخطأ
          if (sellerIdToPersist.includes('*')) {
            console.warn('⚠️ تم اكتشاف نجوم في القيمة النهائية، جاري التنظيف...');
            sellerIdToPersist = sellerIdToPersist.replace(/\*/g, '').trim() || 'غير متوفر';
          }
          
          console.log('🎯 التحديث النهائي - القيمة التي سيتم حفظها:', sellerIdToPersist);
          
          const { data: afterUpdate, error: afterUpdateErr } = await supabase
            .from('transfer_records')
            .update({ seller_id_last6: sellerIdToPersist })
            .eq('id', latestTransferForUpdate.id)
            .select();

          if (afterUpdateErr) {
            console.error('❌ فشل التحديث المباشر لـ seller_id_last6 بعد النقل:', afterUpdateErr);
          } else {
            console.log('✅ تم تثبيت seller_id_last6 مباشرة بعد النقل:', afterUpdate);
          }
        } else {
          console.error('❌ لم يتم العثور على سجل النقل لتثبيت seller_id_last6 مباشرة:', latestFetchErr);
        }
      } catch (postFixErr) {
        console.error('❌ خطأ غير متوقع أثناء تثبيت seller_id_last6 بعد النقل:', postFixErr);
      }

      // 5) عرض رسالة النجاح وإعادة التوجيه
      toast({
        title: 'تمت العملية بنجاح',
        description: 'تم تحديث كلمة المرور ونقل ملكية الهاتف بنجاح.',
        className: "bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rtl"
      });

      setSuccess(true);
      setShowPasswordDialog(false);
      setTimeout(() => navigate('/dashboard'), 2000); // الانتقال إلى لوحة التحكم أو صفحة مناسبة
    } catch (error: any) {
      console.error("Error during ownership transfer:", error);
      // تحسين رسالة الخطأ لتكون أكثر تحديدًا
      let errorMessage = 'حدث خطأ أثناء معالجة الطلب';
      if (error && error.message) {
        // عرض رسالة الخطأ من Supabase مباشرة إذا كانت متاحة
        errorMessage = error.message;
      }
      toast({ title: 'خطأ', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // يجب استدعاء setCurrentPhoneReport عند الحاجة، مثلاً عند اختيار بلاغ معين للتعامل معه
  // هذا الجزء من الكود غير مكتمل في الملف الأصلي لكيفية تعيين currentPhone

  useEffect(() => {
    let logoutTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        navigate('/login'); // Redirect to login page instead of logout (to avoid 404)
      }, 5 * 60 * 1000); // 5 minutes in milliseconds
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      } else {
        clearTimeout(logoutTimer);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetTimer();

    return () => {
      clearTimeout(logoutTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  useEffect(() => {
    const fetchBusinessData = async () => {
      // Check if the user is a business user
      if (user && user.role === 'business') {
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
            setBuyerName(data.store_name || '');
            setBuyerPhone(data.phone || '');
            // toast({
            //   title: 'بيانات المتجر',
            //   description: 'تم ملء بيانات المشتري تلقائياً.',
            // });
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
  }, [user, t, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-imei-dark px-4 py-8" dir="rtl">
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-imei-darker rounded-xl p-4 w-full max-w-md">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg mb-4"
            />
            <div className="flex justify-center gap-4">
              <button
                onClick={captureSelfie}
                className="bg-imei-cyan hover:bg-cyan-700 text-white py-2 px-4 rounded-xl font-bold"
              >
                {t('capture')}
              </button>
              <button
                onClick={closeCamera}
                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-xl font-bold"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-imei-darker rounded-xl shadow-lg p-8 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-imei-cyan hover:text-cyan-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('back')}</span>
          </button>
          <h1 className="font-bold glowing-text text-4xl tracking-wider">IMEI<sup className="text-xs align-super">•</sup></h1>
        </div>
        <h2 className="text-2xl font-bold text-imei-cyan mb-6 text-center">{t('transfer_ownership')}</h2>
        {isLoading && <p className="text-center text-white my-4">{t('loading')}...</p>}
        {success ? (
          <div className="text-green-500 text-center text-lg font-semibold py-8">
            {t('ownership_transferred')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-1">IMEI</label>
                <div className="relative">
                  {isPhoneReported !== null && imei.length === 15 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isPhoneReported ? (
                        <span className="text-red-500 font-bold">{t('lost')}</span>
                      ) : (
                        <span className="text-green-500">✓</span>
                      )}
                    </div>
                  )}
                  <Input
                    type="text"
                    value={imei}
                    onChange={handleImeiChange}
                    className="input-field w-full font-mono pr-10"
                    maxLength={15}
                    placeholder="123456789012345"
                    required
                    disabled={isLoading}
                  />
                </div>
                {isPhoneReported && imei.length === 15 && (
                  <div className="mt-2 text-red-500 text-sm">
                    {t('phone_reported')}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-white mb-1">{t('phone_type')}</label>
                <input
                  type="text"
                  value={phoneType}
                  onChange={e => setPhoneType(e.target.value)}
                  className="input-field w-full"
                  required
                  disabled={!!phoneType || isLoading} // يبقى معطلاً إذا تم ملؤه تلقائياً
                  readOnly={!!phoneType}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-white font-semibold text-xl border-b border-imei-cyan pb-2">
                  {t('seller_info')}
                </h3>
                <div>
                  <label className="block text-white mb-1">{t('seller_name')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maskedSellerName}
                      className="input-field w-full bg-imei-darker border-imei-cyan/30 text-white"
                      readOnly
                    />
                    <input
                      type="hidden"
                      value={sellerName}
                      name="original_seller_name"
                    />
                  </div>
                  <p className="text-xs text-imei-cyan mt-1">اسم البائع مخفي لحماية الخصوصية</p>
                </div>
                <div>
                  <label className="block text-white mb-1">رقم البطاقة الشخصية</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maskedSellerId}
                      className="input-field w-full bg-imei-darker border-imei-cyan/30 text-white"
                      readOnly
                    />
                    <input
                      type="hidden"
                      value={sellerIdLast6}
                      name="original_seller_id"
                    />
                  </div>
                  <p className="text-xs text-imei-cyan mt-1">يظهر آخر 4 أرقام فقط من البطاقة</p>
                </div>
                <div>
                  <label className="block text-white mb-1">{t('seller_phone')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maskedSellerPhone}
                      className="input-field w-full bg-imei-darker border-imei-cyan/30 text-white"
                      readOnly
                    />
                    <input
                      type="hidden"
                      value={sellerPhone}
                      name="original_seller_phone"
                    />
                  </div>
                  <p className="text-xs text-imei-cyan mt-1">يظهر آخر رقمين فقط من الهاتف</p>
                </div>
                {phoneImage && (
                  <div className="space-y-2">
                    <label className="block text-white mb-1">{t('phone_image')}</label>
                    <img 
                      src={phoneImage} 
                      alt={t('phone_image')}
                      className="w-full h-48 object-contain rounded-lg shadow-lg bg-imei-dark p-2 border border-imei-cyan/30"
                    />
                  </div>
                )}
                {originalReceiptImage && (
                  <div className="space-y-2">
                    <label className="block text-white mb-1">{t('receipt_image')}</label>
                    <img 
                      src={originalReceiptImage} 
                      alt={t('receipt_image')}
                      className="w-full h-48 object-contain rounded-lg shadow-lg bg-imei-dark p-2 border border-imei-cyan/30"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <h3 className="text-white font-semibold text-xl border-b border-imei-cyan pb-2">
                  {t('buyer_info')}
                </h3>
                <div>
                  <label className="block text-white mb-1">{t('buyer_name')}</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    className="input-field w-full"
                    required
                  disabled={isLoading || user?.role === 'business'}
                  />
                </div>
                <div>
                  <label className="block text-white mb-1">{t('buyer_phone')}</label>
                  <input
                    type="text"
                    value={buyerPhone}
                    onChange={e => setBuyerPhone(e.target.value.replace(/\D/g, ''))}
                    className="input-field w-full"
                    maxLength={15}
                    required
                  disabled={isLoading || user?.role === 'business'}
                  />
                </div>
                {/* Removed buyerIdImage and buyerSelfie fields as per request */}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-white font-semibold text-xl border-b border-imei-cyan pb-2">
                {t('receipt_info')}
              </h3>
              <div className="mb-4 bg-gradient-to-br from-imei-darker via-imei-dark to-imei-darker p-4 rounded-xl border border-imei-cyan/30 hover:border-imei-cyan/60 transition-all duration-300 shadow-lg hover:shadow-xl w-full">
                <div className="flex items-center mb-2">
                  <FileText className="w-6 h-6 mr-2 text-imei-cyan" />
                  <label className="text-lg font-bold bg-gradient-to-r from-white to-imei-cyan bg-clip-text text-transparent">
                    {t('receipt_image')}
                  </label>
                </div>

                <div className="flex flex-col space-y-2">
                  {receiptImage ? (
                    <div className="relative group overflow-hidden rounded-lg">
                      <img
                        src={receiptImage}
                        alt={t('receipt_image')}
                        className="w-full h-40 object-cover rounded-lg border border-imei-cyan/30 group-hover:border-imei-cyan/50 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => setReceiptImage('')}
                          className="text-white text-sm font-medium px-4 py-2 rounded-full bg-red-500/50 backdrop-blur-md border border-white/20 hover:bg-red-500/80"
                        >
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-imei-cyan/20 rounded-lg flex flex-col items-center justify-center bg-gradient-to-b from-imei-dark/30 to-imei-darker/30 group hover:border-imei-cyan/40 transition-all duration-300">
                      <FileText className="w-16 h-16 text-imei-cyan/60 group-hover:text-imei-cyan/80 transition-colors duration-300" strokeWidth={1} />
                      <p className="text-center text-sm text-imei-cyan/60 mt-2">{t('no_receipt_preview')}</p>
                      <p className="text-xs mt-1 text-imei-cyan/40">{t('image_will_be_displayed_here')}</p>
                    </div>
                  )}

                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <input type="file" id="receipt-upload" ref={receiptFileInputRef} accept="image/*" onChange={(e) => handleImageUpload(e, setReceiptImage)} className="hidden" />
                    <label htmlFor="receipt-upload" className="flex-1 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700 text-white py-2 px-2 rounded-lg text-center cursor-pointer transition-all duration-300 shadow hover:shadow-md flex items-center justify-center text-sm">
                      <Upload className="w-4 h-4 ml-1 rtl:mr-1" />
                      {t('upload')}
                    </label>
                    <Button type="button" onClick={() => openCamera('receipt')} className="flex-1 bg-gradient-to-r from-cyan-800 via-cyan-700 to-cyan-800 hover:from-cyan-700 hover:via-cyan-600 hover:to-cyan-700 text-white py-2 px-2 rounded-lg transition-all duration-300 shadow hover:shadow-md flex items-center justify-center text-sm">
                      <Camera className="w-4 h-4 ml-1 rtl:mr-1" />
                      {t('capture')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 bg-imei-cyan hover:bg-imei-cyan-dark text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                  disabled={isLoading || isPhoneReported === true} // تعطيل إذا كان الهاتف مبلغ عنه - تم إلغاء شرط الدفع مؤقتاً
                >
                  {isLoading ? t('processing') : t('transfer_ownership')}
                </Button>
              </div>
            </div>
          </form>
        )}

        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent className="bg-imei-darker text-white border-2 border-imei-cyan shadow-lg shadow-imei-cyan/20 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-imei-cyan text-xl mb-4">
                {t('unregistered_phone') || 'هاتف غير مسجل'}
              </DialogTitle>
              <DialogDescription className="text-white mb-6">
                {t('unregistered_phone_prompt') || 'هذا الهاتف غير مسجل بالنظام. هل تريد التسجيل قبل نقل الملكية؟'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRegisterDialog(false);
                  setImei(''); // مسح حقل IMEI عند الضغط على "لا"
                }}
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                {t('no') || 'لا'}
              </Button>
              <Button
                onClick={() => {
                  navigate('/register-phone', { 
                    state: { 
                      fromPurchase: true, 
                      imei: imei,
                      editMode: true, // إضافة علامة تشير إلى أن الحقول قابلة للتعديل
                      initialData: {  // وضع البيانات في كائن منفصل
                        ownerName: sellerName || undefined,
                        phoneNumber: sellerPhone || undefined,
                        phoneType: phoneType || undefined
                      }
                    } 
                  });
                }}
                className="bg-imei-cyan hover:bg-imei-cyan-dark text-white"
              >
                {t('yes') || 'نعم'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-imei-darker text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-imei-cyan text-xl mb-2 text-center">
                نقل ملكية الهاتف
              </DialogTitle>
              <DialogDescription className="text-white mb-6 text-center">
                لإتمام عملية نقل الملكية، يجب إدخال كلمة مرور البائع الحالية وتعيين كلمة مرور جديدة للمشتري.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-white text-sm font-medium mb-1">
                  كلمة مرور البائع الحالية
                </label>
                <Input
                  type="password"
                  value={sellerPassword}
                  onChange={(e) => setSellerPassword(e.target.value)}
                  className="bg-imei-dark border-imei-cyan text-white"
                  placeholder="أدخل كلمة مرور البائع الحالية"
                  disabled={isLoading}
                  required
                />
                {!sellerPassword && <p className="text-xs text-red-400 mt-1">يجب إدخال كلمة مرور البائع</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-white text-sm font-medium mb-1">
                  كلمة مرور المشتري الجديدة
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-imei-dark border-imei-cyan text-white"
                  placeholder="6 أحرف على الأقل"
                  disabled={isLoading}
                  required
                />
                {!newPassword && <p className="text-xs text-red-400 mt-1">يجب إدخال كلمة مرور للمشتري</p>}
                {newPassword && newPassword.length < 6 && <p className="text-xs text-red-400 mt-1">كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل</p>}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="text-white border-gray-600 hover:bg-gray-700"
                disabled={isLoading}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                className="bg-imei-cyan hover:bg-imei-cyan-dark text-white"
                disabled={isLoading}
              >
                {isLoading ? t('processing') : t('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BusinessTransferBuy;
