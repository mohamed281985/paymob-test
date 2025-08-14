import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, History, ArrowLeft, AlertCircle, CheckCircle, XCircle, Image as ImageIcon, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase'; // استيراد Supabase
import { mockPhoneReports } from '../services/mockData';
import jsPDF from 'jspdf';
import { processArabicTextWithEncoding as processArabicText, loadArabicFontSafe as loadArabicFont } from '../utils/pdf/arabic-final-solution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '../contexts/AuthContext'; // استيراد useAuth
import ImageViewer from '@/components/ImageViewer';

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

// إضافة مكون ImageUploader
const ImageUploader: React.FC<{
  label: string;
  image: string;
  setImage: (url: string) => void;
  onCameraClick: () => void;
  disabled?: boolean;
}> = ({ label, image, setImage, onCameraClick, disabled }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  // إضافة مستمع للنقر خارج المربع المنسدل
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    setShowOptions(false);
  };

  const handleCameraClick = () => {
    onCameraClick();
    setShowOptions(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-white mb-1">{label}</label>
      <div className="relative group">
        {image ? (
          <div className="relative">
            <img 
              src={image} 
              alt={label}
              className="w-full h-48 object-cover rounded-lg shadow-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-2">
              <button
                onClick={() => setImage('')}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                title={t('remove') || 'حذف'}
              >
                <XCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowOptions(true)}
                className="bg-imei-cyan hover:bg-cyan-700 text-white p-2 rounded-full"
                title={t('change_photo') || 'تغيير الصورة'}
                disabled={disabled}
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-imei-cyan border-opacity-50 rounded-lg p-6 text-center hover:border-opacity-100 transition-all duration-200">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-imei-cyan bg-opacity-10 p-4 rounded-full">
                <ImageIcon className="w-8 h-8 text-imei-cyan" />
              </div>
              <div className="relative" ref={optionsRef}>
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-2 bg-imei-cyan hover:bg-cyan-700 text-white py-2 px-4 rounded-xl transition-all duration-200"
                  disabled={disabled}
                >
                  <Camera className="w-5 h-5" />
                  <span>{t('add_photo') || 'إضافة صورة'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showOptions ? 'rotate-180' : ''}`} />
                </button>
                
                {showOptions && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-imei-darker border border-imei-cyan rounded-lg shadow-lg z-10 overflow-hidden">
                    <button
                      onClick={handleCameraClick}
                      className="flex items-center gap-2 w-full px-4 py-3 text-white hover:bg-imei-cyan transition-colors duration-200 border-b border-imei-cyan border-opacity-20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{t('take_photo') || 'التقاط صورة'}</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 w-full px-4 py-3 text-white hover:bg-imei-cyan transition-colors duration-200"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{t('choose_from_gallery') || 'اختيار من الاستديو'}</span>
                    </button>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BusinessTransfer: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentSelfieType, setCurrentSelfieType] = useState<'seller' | 'sellerId' | 'receipt' | null>(null);
  const { user } = useAuth(); // استخدام hook useAuth
  const [showRegisterDialog, setShowRegisterDialog] = useState(false); // حالة جديدة للنافذة المنبثقة
  const [isFormLocked, setIsFormLocked] = useState(false);

  // حالة عرض الصور المكبرة
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const [imei, setImei] = useState('');
  const [phoneType, setPhoneType] = useState('');
  const [phoneImage, setPhoneImage] = useState<string>('');
  const [originalReceiptImage, setOriginalReceiptImage] = useState<string>('');
  const [sellerName, setSellerName] = useState('');
  const [sellerIdLast6, setSellerIdLast6] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerIdLast6, setBuyerIdLast6] = useState('');
  const [paid, setPaid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPhoneReported, setIsPhoneReported] = useState<boolean | null>(null);

  // Image states
  const [sellerIdImage, setSellerIdImage] = useState<string>('');
  const [sellerSelfie, setSellerSelfie] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');

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

  const [newOwnerName, setNewOwnerName] = useState('');
  // أزلنا الحالة العامة password لأنها غير مستخدمة وتتسبب في تحقق خاطئ
  const [sellerPassword, setSellerPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRegisteredPhone, setCurrentRegisteredPhone] = useState<any>(null); // لتخزين سجل الهاتف من registered_phones

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

  const openCamera = (type: 'seller' | 'sellerId' | 'receipt') => {
    setCurrentSelfieType(type);
    setIsCameraOpen(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        toast({
          title: t('camera_error') || 'خطأ في الكاميرا',
          description: t('camera_permission_required') || 'يرجى السماح باستخدام الكاميرا',
          variant: 'destructive'
        });
      });
  };

  const captureSelfie = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        if (currentSelfieType === 'seller') {
          setSellerSelfie(imageData);
        } else if (currentSelfieType === 'sellerId') {
          setSellerIdImage(imageData);
        } else if (currentSelfieType === 'receipt') {
          setReceiptImage(imageData);
        }
        closeCamera();
      }
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
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

  const handleImeiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setImei(value);
    setIsFormLocked(false);
    // إعادة تعيين الحالات عند كل تغيير
    if (user?.role !== 'business') {
      setSellerName('');
      setSellerIdLast6('');
      setSellerPhone('');
    }
    setPhoneType('');
    setPhoneImage('');
    setOriginalReceiptImage('');
    setIsPhoneReported(null);

    if (value.length === 15) {
      setIsLoading(true);
      const fetchData = async () => {
        try {
          // 1. التحقق من وجود بلاغ فعال
          const { count: reportCount, error: reportError } = await supabase
            .from('phone_reports')
            .select('*', { count: 'exact', head: true })
            .eq('imei', value)
            .eq('status', 'active');

          if (reportError) throw reportError;

          const isReported = (reportCount ?? 0) > 0;
          setIsPhoneReported(isReported);

          if (isReported) {
            toast({ title: t('warning'), description: t('phone_is_reported_as_lost'), variant: 'destructive' });
            return; // لا تتابع إذا كان هناك بلاغ
          }

          // 2. التحقق مما إذا كان الهاتف مسجلاً
          const { data: registeredPhone, error: regError } = await supabase
            .from('registered_phones')
            .select('owner_name, phone_number, phone_type, phone_image_url, receipt_image_url, id_last6')
            .eq('imei', value)
            .maybeSingle();

          if (regError) throw regError;

          if (registeredPhone) {
            // التحقق مما إذا كان الهاتف مسجل باسم المستخدم التجاري الحالي
            if (user?.role === 'business' && registeredPhone.owner_name !== sellerName) {
              toast({
                title: t('error'),
                description: t('phone_registered_to_different_user') || 'هذا الهاتف مسجل لمستخدم آخر',
                variant: 'destructive'
              });
              setIsFormLocked(true);
              return;
            }

            // الهاتف مسجل للمستخدم الحالي، املأ البيانات
            if (user?.role !== 'business') {
              setSellerName(registeredPhone.owner_name || '');
              setSellerPhone(registeredPhone.phone_number || '');
              setSellerIdLast6(registeredPhone.id_last6 || '');
            }
            setPhoneType(registeredPhone.phone_type || '');
            setPhoneImage(registeredPhone.phone_image_url || '');
            setOriginalReceiptImage(registeredPhone.receipt_image_url || '');
          } else {
            // الهاتف غير مسجل، أظهر النافذة المنبثقة
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
    } else {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!imei || !buyerName || !buyerPhone || !sellerName || !buyerIdLast6 || !buyerEmail) { // التأكد من وجود اسم البائع أيضاً
        toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // التحقق من صحة الإيميل
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(buyerEmail)) {
        toast({ title: 'خطأ', description: 'يرجى إدخال بريد إلكتروني صحيح', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (buyerIdLast6.length !== 6) {
        toast({ title: 'خطأ', description: 'يجب أن يتكون رقم البطاقة من 6 أرقام', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // البحث عن الهاتف في قاعدة بيانات registered_phones (نحتاج id_last6 للتحقق المؤقت)
      const { data: phone, error: fetchError } = await supabase
        .from('registered_phones')
        .select('owner_name, phone_number, id_last6, phone_image_url, receipt_image_url, phone_type') // الحقول اللازمة للتحقق والحفظ
        .eq('imei', imei)
        .single(); // يفترض وجود هاتف واحد بهذا IMEI

      if (fetchError || !phone) {
        toast({ 
          title: 'خطأ', 
          description: 'لم يتم العثور على الهاتف في قاعدة البيانات للتسجيل الأولي',
          variant: 'destructive',
          className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
        });
        setIsLoading(false);
        return;
      }

      // تعيين بيانات الهاتف في currentRegisteredPhone لاستخدام id_last6 والصور لاحقًا
      setCurrentRegisteredPhone(phone);

      // عرض نافذة الحوار بدلاً من استخدام prompt
      setShowPasswordDialog(true);
      setIsLoading(false);
      return;

      // تم تعطيل هذا الكود واستبداله بنافذة الحوار المخصصة
      /* 
      const newPassword = prompt('...');
      */

      // تم حذف كود prompt القديم
      
      /* الكود القديم معطل - لم يعد مستخدماً */
      if (false) { // تم تعديله لمنع التنفيذ
        // تحديث كلمة المرور وبيانات المالك الجديد في registered_phones
        const { error: updateError } = await supabase
          .from('registered_phones')
          .update({
            // password: newPassword, // تم تعطيل تحديث كلمة المرور
            owner_name: buyerName,
            phone_number: buyerPhone,
            id_last6: buyerIdLast6,
            last_transfer_date: new Date().toISOString()
          })
          .eq('imei', imei);

        if (updateError) throw updateError;

        // إنشاء سجل نقل ملكية جديد في جدول transfer_records
        const transferRecordData = {
          date: new Date().toISOString(),
          imei: imei,
          phone_type: phoneType,
          seller_name: sellerName, // اسم البائع من الحقول المملوءة
          seller_phone: sellerPhone,
          seller_id_last6: sellerIdLast6, // Add seller's ID to transfer record
          // Removed seller_id_image and seller_selfie from transferRecordData as per request
          // seller_id_image: sellerIdImage,
          // seller_selfie: sellerSelfie,
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          buyer_id_last6: buyerIdLast6,
          receipt_image: receiptImage,
          phone_image: phoneImage, // صورة الهاتف الأساسية
        };

        const { error: insertTransferError } = await supabase
          .from('transfer_records')
          .insert([transferRecordData]);

        if (insertTransferError) throw insertTransferError;

        toast({
          title: t('success'),
          description: t('password_updated_ownership_registered'),
          className: "bg-gradient-to-r from-green-500 to-green-600 text-white"
        });

        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000); // الانتقال إلى لوحة التحكم أو صفحة مناسبة
      }
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

  const handlePasswordSubmit = async () => {
    setIsLoading(true);
    try {
      // 1) تحقق المدخلات في مربع الحوار - بالعربية وبدقة
      if (!sellerPassword || sellerPassword.trim().length === 0) {
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
      if (newPassword.trim().length < 6) {
        toast({ 
          title: 'كلمة المرور قصيرة', 
          description: 'يجب أن تتكون كلمة مرور المشتري من 6 أحرف على الأقل', 
          variant: 'destructive',
          className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
        });
        setIsLoading(false);
        return;
      }

      if (!currentRegisteredPhone) {
        toast({ 
          title: 'بيانات غير موجودة',
          description: 'لم يتم العثور على بيانات الهاتف في النظام',
          variant: 'destructive',
          className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
        });
        setIsLoading(false);
        return;
      }

      // 2) التحقق المؤقت: (تخطي تحقق رقم البطاقة إذا كان البائع مستخدمًا تجاريًا)
      // إذا كان المستخدم التجاري (seller) هو الذي ينفذ العملية، لا نتحقق من رقم البطاقة ونكمل مباشرة.
      if (!(user && user.role === 'business')) {
        const { data: latestRegistered, error: latestErr } = await supabase
          .from('registered_phones')
          .select('id_last6')
          .eq('imei', imei)
          .single();

        if (latestErr || !latestRegistered) {
          toast({ 
            title: 'تعذر التحقق',
            description: 'تعذر جلب بيانات التحقق للبائع، حاول مرة أخرى',
            variant: 'destructive',
            className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
          });
          setIsLoading(false);
          return;
        }

        // حالة خاصة: إذا كانت القيمة في السجل NULL أو فارغة، نتجاوز تحقق المطابقة
        const registeredSellerId6 = latestRegistered.id_last6 == null ? '' : latestRegistered.id_last6.toString().trim();
        const enteredSellerId6 = (sellerIdLast6 || '').toString().trim();

        if (registeredSellerId6 === '') {
          console.warn('⚠️ سجل الهاتف ليس لديه id_last6 محفوظ (NULL/فارغ). سيتم تجاوز تحقق المطابقة.');
        } else {
          if (!enteredSellerId6 || registeredSellerId6 !== enteredSellerId6) {
            toast({ 
              title: 'فشل التحقق من هوية البائع',
              description: 'آخر 6 أرقام من بطاقة البائع لا تتطابق مع السجل',
              variant: 'destructive',
              className: 'bg-red-50 text-red-800 font-bold rtl border-2 border-red-500'
            });
            setIsLoading(false);
            return;
          }
        }
      } else {
        console.log('🚫 تم تخطي تحقق رقم بطاقة البائع لأن البائع مستخدم تجاري.');
      }

      // 3) رفع صورة الفاتورة الجديدة (إذا وجدت)
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

      // 4) تحديث بيانات مالك الهاتف وكلمة المرور الجديدة
      const { error: updateError } = await supabase
        .from('registered_phones')
        .update({
          owner_name: buyerName,
          phone_number: buyerPhone,
          id_last6: buyerIdLast6,
          email: buyerEmail, // إضافة إيميل المشتري
          password: newPassword, // تحديث كلمة المرور الجديدة للمشتري
          last_transfer_date: new Date().toISOString(),
          receipt_image_url: newReceiptImageUrl || currentRegisteredPhone.receipt_image_url
        })
        .eq('imei', imei);

      if (updateError) throw updateError;

      // 5) إنشاء سجل نقل ملكية في جدول transfer_records
      // ملاحظة: حسب طلبك، نريد أن يظهر في عمود seller_id_last6 رقم بطاقة "المشتري السابق" (أي المالك السابق قبل النقل).
      // المالك السابق هو السجل الحالي في registered_phones قبل التحديث، وبالتالي رقمه هو currentRegisteredPhone.id_last6.
      // لذا سنُبقي seller_id_last6 = currentRegisteredPhone.id_last6 حتى يُخزن في سجل النقل كرقم بطاقة المالك السابق.
      const transferRecord = {
        date: new Date().toISOString(),
        imei: imei,
        phone_type: phoneType,
        seller_name: sellerName,
        seller_phone: sellerPhone,
        // إذا كان البائع مستخدمًا تجاريًا عوّض القيمة بـ NULL، وإلا استخدم رقم المالك السابق
        seller_id_last6: (user && user.role === 'business') ? null : currentRegisteredPhone.id_last6,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_id_last6: buyerIdLast6,
        receipt_image: newReceiptImageUrl || currentRegisteredPhone.receipt_image_url,
        phone_image: phoneImage
      };

      const { error: insertError } = await supabase
        .from('transfer_records')
        .insert([transferRecord]);

      if (insertError) throw insertError;

      // 5) نجاح
      toast({
        title: 'تمت العملية بنجاح',
        description: 'تم تحديث كلمة المرور ونقل ملكية الهاتف بنجاح',
        className: "bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rtl"
      });

      setSuccess(true);
      setShowPasswordDialog(false);
    } catch (error: any) {
      console.error("Error in handlePasswordSubmit:", error);
      let errorMessage = 'حدث خطأ أثناء معالجة الطلب';
      if (error && error.message) {
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
        navigate('/logout'); // Redirect to logout page
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
            setSellerName(data.store_name || '');
            setSellerPhone(data.phone || '');
            // toast({
            //   title: 'بيانات المتجر',
            //   description: 'تم ملء بيانات البائع تلقائياً.',
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
                  disabled={!!phoneType || isLoading || isFormLocked} // يبقى معطلاً إذا تم ملؤه تلقائياً
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
                  <input
                    type="text"
                    value={sellerName}
                    onChange={e => setSellerName(e.target.value)}
                    className="input-field w-full"
                    required
                    disabled={isLoading || user?.role === 'business' || isFormLocked}
                  />
                </div>
                <div>
                  <label className="block text-white mb-1">{t('seller_phone')}</label>
                  <input
                    type="text"
                    value={sellerPhone}
                    onChange={e => setSellerPhone(e.target.value.replace(/\D/g, ''))}
                    className="input-field w-full"
                    maxLength={15}
                    required
                    disabled={isLoading || user?.role === 'business' || isFormLocked}
                  />
                </div>
                {phoneImage && (
                  <div className="space-y-2">
                    <label className="block text-white mb-1">{t('phone_image')}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(phoneImage);
                        setIsImageViewerOpen(true);
                      }}
                      className="w-full cursor-pointer"
                    >
                      <img 
                        src={phoneImage} 
                        alt={t('phone_image')}
                        className="w-full h-48 object-contain rounded-lg shadow-lg bg-imei-dark p-2 border border-imei-cyan/30 transition-transform hover:scale-[1.02]"
                      />
                    </button>
                  </div>
                )}
                {originalReceiptImage && (
                  <div className="space-y-2">
                    <label className="block text-white mb-1">{t('receipt_image')}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(originalReceiptImage);
                        setIsImageViewerOpen(true);
                      }}
                      className="w-full cursor-pointer"
                    >
                      <img 
                        src={originalReceiptImage} 
                        alt={t('receipt_image')}
                        className="w-full h-48 object-contain rounded-lg shadow-lg bg-imei-dark p-2 border border-imei-cyan/30 transition-transform hover:scale-[1.02]"
                      />
                    </button>
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
                    disabled={isLoading || isFormLocked}
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
                    disabled={isLoading || isFormLocked}
                  />
                </div>
                <div>
                  <label className="block text-white mb-1">{t('buyer_email') || 'إيميل المشتري'}</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={e => setBuyerEmail(e.target.value)}
                    className="input-field w-full"
                    required
                    disabled={isLoading || isFormLocked}
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-white mb-1">آخر 6 أرقام من البطاقة الشخصية</label>
                  <input
                    type="text"
                    value={buyerIdLast6}
                    onChange={e => setBuyerIdLast6(e.target.value.replace(/\D/g, ''))}
                    className="input-field w-full"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="******"
                    required
                    disabled={isLoading || isFormLocked}
                  />
                </div>
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
                  disabled={isLoading || isPhoneReported === true || isFormLocked} // تعطيل إذا كان الهاتف مبلغ عنه - تم إلغاء شرط الدفع مؤقتاً
                >
                  {isLoading ? t('processing') : t('transfer_ownership')}
                </Button>
              </div>
            </div>
          </form>
        )}

        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent className="bg-imei-darker text-white border-2 border-imei-cyan shadow-lg shadow-imei-cyan/20">
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
                onClick={() => navigate('/register-phone', { state: { imei: imei, fromBusinessSale: true } })}
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
                إلغاء
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                className="bg-imei-cyan hover:bg-imei-cyan-dark text-white"
                disabled={isLoading}
              >
                {isLoading ? 'جاري المعالجة...' : 'تأكيد'}
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
    </div>
  );
};

export default BusinessTransfer;
