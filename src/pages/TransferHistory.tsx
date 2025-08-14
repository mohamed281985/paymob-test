import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Import Supabase
import { useLanguage } from '../contexts/LanguageContext';
import { format } from 'date-fns';
import { processArabicTextWithEncoding as processArabicText, loadArabicFontSafe as loadArabicFont } from '../utils/pdf/arabic-final-solution';
import ImageViewer from '@/components/ImageViewer';

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
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import autoTable from 'jspdf-autotable';

import bidiFactory from 'bidi-js';

import * as ArabicReshaper from 'arabic-persian-reshaper'; // Changed import

// UI Components
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Icons
import { Search, ArrowLeft, Upload, AlertCircle, History, FileDown } from 'lucide-react';

// Data
import { mockPhoneReports } from '../services/mockData';

// Custom Components
import PageContainer from '../components/PageContainer';
import AppNavbar from '../components/AppNavbar';
import BackButton from '../components/BackButton';

interface TransferRecord {
  id: string; // or number if id is numeric in the database
  date: string;
  imei: string;
  phone_type: string;

  // بيانات البائع
  seller_name: string;
  seller_phone: string;
  seller_id_last6?: string; // رقم بطاقة البائع - جعلناه اختياري
  seller_type?: string; // نوع البائع (تجاري أو عادي)

  // بيانات المشتري
  buyer_name: string;
  buyer_phone: string;
  buyer_id_last6?: string; // رقم بطاقة المشتري - جعلناه اختياري
  buyer_type?: string; // نوع المشتري (تجاري أو عادي)

  // الصور (جعلناها اختيارية لمزيد من المرونة)
  seller_id_image?: string;
  seller_selfie?: string;
  buyer_id_image?: string;
  buyer_selfie?: string;
  receipt_image?: string;
  phone_image?: string;

  // أي حقول إضافية قد تكون موجودة في الجدول
  [key: string]: any;
}


// وظيفة مساعدة للتحقق إذا كان البائع تجاريًا - تم تعديلها للعمل مع هيكل الجدول الحالي
const isSellerBusiness = (record: TransferRecord): boolean => {
  try {
    // التحقق من حقول مختلفة محتملة للبائع التجاري

    // التحقق من seller_type إذا كان موجوداً
    if (record.seller_type === 'business' || record.seller_type === 'store') return true;

    // التحقق من seller_id_last6 - إذا كان فارغاً أو يحتوي على كلمة "متجر"
    if (record.seller_id_last6 === null || record.seller_id_last6 === undefined || 
        record.seller_id_last6 === "" || record.seller_id_last6 === "متجر") return true;

    // يمكن إضافة تحققات أخرى حسب الحاجة...

    return false;
  } catch (error) {
    console.error('خطأ في التحقق من نوع البائع:', error);
    return false;
  }
}

// وظيفة مساعدة للتحقق إذا كان المشتري تجاريًا - تم تعديلها للعمل مع هيكل الجدول الحالي
const isBuyerBusiness = (record: TransferRecord): boolean => {
  try {
    // التحقق من حقول مختلفة محتملة للمشتري التجاري

    // التحقق من buyer_type إذا كان موجوداً
    if (record.buyer_type === 'business' || record.buyer_type === 'store') return true;

    // التحقق من buyer_id_last6 - إذا كان فارغاً أو يحتوي على كلمة "متجر"
    if (record.buyer_id_last6 === null || record.buyer_id_last6 === undefined || 
        record.buyer_id_last6 === "" || record.buyer_id_last6 === "متجر") return true;

    // يمكن إضافة تحققات أخرى حسب الحاجة...

    return false;
  } catch (error) {
    console.error('خطأ في التحقق من نوع المشتري:', error);
    return false;
  }
}


const TransferHistory: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  // const [imei, setImei] = useState(''); // No longer used directly here
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [phoneImage, setPhoneImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPhoneReported, setIsPhoneReported] = useState<boolean | null>(null);
  const [existingPhoneImage, setExistingPhoneImage] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // حالة عرض الصور المكبرة
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTransferRecords = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transfer_records') // Name of the transfer records table in Supabase
        .select('*');

      if (error) {
        console.error('Error fetching transfer records:', error);
      } else {
        console.log('Fetched transfer records:', data); // Debugging log
        setRecords(data as TransferRecord[]);
      }
      setIsLoading(false);
    };

    fetchTransferRecords();
  }, []);

  const findPhoneImage = async (imei: string): Promise<string | null> => {
    // Search in transfer records from Supabase
    const { data: transferData, error: transferError } = await supabase
      .from('transfer_records')
      .select('phone_image')
      .eq('imei', imei)
      .maybeSingle();

    if (transferError) console.error('Error finding phone image in transfers:', transferError);
    if (transferData?.phone_image) {
      return transferData.phone_image;
    }

    // Search in phone reports from Supabase
    const { data: reportData, error: reportError } = await supabase
      .from('phone_reports') // Name of the phone reports table
      .select('phone_image_url') // Assuming the column name is phone_image_url
      .eq('imei', imei)
      .maybeSingle();

    if (reportError) console.error('Error finding phone image in reports:', reportError);
    if (reportData?.phone_image_url) {
      return reportData.phone_image_url;
    }

    // Search in mockData as a last resort (if still needed)
    const mockReport = mockPhoneReports.find(report => report.imei === imei);
    if (mockReport?.phoneImage) {
      return mockReport.phoneImage;
    }

    return null;
  };

  const checkPhoneStatus = async (imei: string): Promise<boolean> => {
    const { data, error, count } = await supabase
      .from('phone_reports')
      .select('status', { count: 'exact' })
      .eq('imei', imei)
      .eq('status', 'active');

    if (error) {
      console.error('Error checking phone status:', error);
      return false;
    }

    console.log('Phone report data:', data); // Debugging log
    console.log('Phone report count:', count); // Debugging log

    return (count ?? 0) > 0;
  };

  const fetchPhoneDetails = async (imei: string) => {
    setIsLoading(true);
    try {
      console.log('جاري البحث عن سجلات نقل ملكية الهاتف برقم IMEI:', imei);

      // تحميل سجلات نقل الملكية للهاتف المحدد فقط
      const { data: transferRecords, error: transferError } = await supabase
        .from('transfer_records')
        .select('*') // تحميل جميع الأعمدة لتجنب مشاكل عدم وجود عمود محدد
        .eq('imei', imei) // فلترة السجلات حسب رقم IMEI المدخل فقط
        .order('date', { ascending: false }); // ترتيب السجلات من الأحدث للأقدم

      if (transferError) {
        console.error('خطأ في تحميل سجلات نقل الملكية:', transferError);
        toast({ 
          title: 'خطأ في البحث', 
          description: 'حدث خطأ أثناء البحث عن سجلات نقل الملكية.', 
          variant: 'destructive' 
        });
      } else {
        if (transferRecords.length === 0) {
          console.warn('لم يتم العثور على سجلات للهاتف برقم IMEI:', imei);
          toast({ 
            title: 'لا توجد سجلات', 
            description: `لم يتم العثور على سجلات نقل ملكية للهاتف برقم IMEI: ${imei}`, 
            variant: 'default' 
          });
        }
        // تحديث قائمة السجلات في واجهة المستخدم
        setRecords(transferRecords as TransferRecord[]);

        // عرض صورة الهاتف من أحدث سجل إن وجدت
        if (transferRecords.length > 0) {
          setPhoneImage(transferRecords[0].phone_image || null);
        }
      }

      // التحقق من حالة الهاتف (مفقود أم لا)
      const isReported = await checkPhoneStatus(imei);
      setIsPhoneReported(isReported);

      // إعادة تعيين حالة صورة الهاتف السابقة
      setExistingPhoneImage(null);
    } catch (error) {
      console.error('Error fetching phone details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    // السماح فقط بالأرقام في حقل البحث
    const value = e.target.value.replace(/\D/g, '');
    setSearchTerm(value);

    if (value.length === 15) {
      // عند إدخال رقم IMEI كامل (15 رقم)، قم بالبحث عن سجلات هذا الهاتف فقط
      fetchPhoneDetails(value);
    } else {
      // إذا كان حقل البحث فارغاً أو غير مكتمل، قم بإعادة تعيين البيانات
      setExistingPhoneImage(null);
      setIsPhoneReported(null);
      setRecords([]);
    }
  };

  // تعديل filteredRecords لعرض السجلات المطابقة لرقم IMEI فقط
  const filteredRecords = records.filter(record => {
    // عند إدخال رقم IMEI كامل، قم بتصفية السجلات لعرض هذا الرقم فقط
    if (searchTerm.length === 15) {
      return record.imei === searchTerm;
    }

    // أثناء الكتابة، قم بعرض السجلات التي تبدأ برقم IMEI المدخل جزئياً
    return record.imei.startsWith(searchTerm);
  });

  /**
   * Generates a PDF document with transfer history, phone image, and IMEI.
   * Includes support for Arabic text by loading the 'Amiri' font.
   * @param recordsToPrint - The transfer records to include in the table.
   * @param imei - The IMEI number to display.
   * @param imageUrl - The URL of the phone image to include.
   */
  const generatePdf = async (recordsToPrint: TransferRecord[], imei: string, imageUrl: string | null) => {


    // التحقق من وجود سجلات للطباعة
    if (!recordsToPrint || recordsToPrint.length === 0) {
      toast({
        title: t('error'),
        description: t('no_records_to_print'), // Please add this translation key
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Generating PDF for IMEI:', imei);
      const doc = new jsPDF();
      let fontForTable = 'helvetica'; // الخط الافتراضي للجدول

      // --- Font Loading for Arabic Support ---
      // jsPDF's default fonts do not support Arabic. We must load a custom font.
      // This example assumes you have 'Amiri-Regular.ttf' in your `public/fonts` directory.
      try {
        const fontLoaded = await loadArabicFont(doc);
        if (!fontLoaded) throw new Error("Font loading failed");
        fontForTable = 'Amiri'; // استخدام الخط العربي للجدول إذا نجح التحميل
      } catch (fontError: any) {
        console.error("Could not load Arabic font. Arabic text might not render correctly.", fontError);
        // في حالة فشل تحميل الخط، قم بتعيين الخط الافتراضي بشكل صريح للعناوين
        doc.setFont('helvetica'); 
        toast({
          title: t('font_load_error_title'), // "خطأ في تحميل الخط"
          description: t('font_load_error_desc'), // "لم نتمكن من تحميل الخط العربي. قد لا يتم عرض النصوص العربية بشكل صحيح."
          variant: 'default',
        });
      }

      // --- تحميل الشعار ---
      try {
        const logoUrl = '/logo.png'; // يفترض وجود الشعار في المجلد public
        const logoResponse = await fetch(logoUrl);
        if (!logoResponse.ok) throw new Error('Logo file not found');
        const logoBlob = await logoResponse.blob();
        const logoDataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
        });
        // إضافة الشعار في أعلى اليسار بشكل مستطيل
        doc.addImage(logoDataUrl, 'PNG', 14, 15, 40, 20); 
      } catch (logoError) {
        console.error("Could not load logo for PDF:", logoError);
      }

      // --- PDF Content ---
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const xPosRight = pageWidth - margin;

      doc.setFontSize(20);
      // تعديل الموضع الرأسي للعنوان ليكون على نفس مستوى الشعار
      doc.text(processArabicText(t('transfer_history')), xPosRight, 22, { align: 'right' }); // العنوان أعلى اليمين
      
      doc.setFontSize(16);
      // تعديل الموضع الرأسي لرقم IMEI
      doc.text(processArabicText(`${t('imei')}: ${imei}`), xPosRight, 32, { align: 'right' }); // رقم IMEI أعلى اليمين

      // إضافة صورة الهاتف في المنتصف
      if (imageUrl) {
        try {
          // Fetch image and convert to data URL to avoid CORS issues in some browsers
          const imgResponse = await fetch(imageUrl);
          const blob = await imgResponse.blob();
          const dataUrl = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
          // توسيط الصورة: (عرض الصفحة - عرض الصورة) / 2
          const imageWidth = 80;
          const xOffset = (doc.internal.pageSize.getWidth() - imageWidth) / 2;
          doc.addImage(dataUrl, 'JPEG', xOffset, 45, imageWidth, 60); // Position: x, y, width, height
        } catch (imgError) {
          console.error("Error adding image to PDF:", imgError);
        }
      }

      // Add Table
      const headers = [
        [
          processArabicText(t('date')),
          processArabicText(t('seller')),
          processArabicText(t('seller_id') || 'رقم بطاقة البائع'),
          processArabicText(t('buyer')),
          processArabicText(t('buyer_id') || 'رقم بطاقة المشتري')
        ]
      ];
      const body = recordsToPrint.map(record => {
        // Robust date formatting
        const dateObj = new Date(record.date);
        const formattedDate = record.date && !isNaN(dateObj.getTime())
          ? format(dateObj, 'dd/MM/yyyy HH:mm')
          : t('not_available');

        // معالجة معلومات البائع والمشتري مع إخفاء البيانات
        // دالة لتنسيق الأسماء في PDF بحيث تظهر الحرف الأول ثم النجوم (عكس الترتيب)
        const formatNamePDF = (name: string): string => {
          if (!name) return '';
          
          // تقسيم الاسم إلى كلمات
          const words = name.trim().split(/\s+/);
          
          // معالجة كل كلمة - الحرف الأول أولاً ثم النجوم
          const formattedWords = words.map(word => {
            if (word.length <= 1) return word;
            // الحرف الأول من الكلمة متبوع بـ 6 نجوم
            return word.charAt(0) + '*'.repeat(6);
          });
          
          // إعادة تجميع الكلمات
          return formattedWords.join(' ');
        };
        
        const sellerName = formatNamePDF(record.seller_name || t('unknown_seller'));
        const buyerName = record.buyer_name ? formatNamePDF(record.buyer_name) : '';

        // معالجة أرقام الهواتف - لإظهارها بشكل **********59 في الPDF
        const formatPhonePDF = (phone: string): string => {
          if (!phone) return '';
          const cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.length <= 2) return cleanPhone;
          return '*'.repeat(cleanPhone.length - 2) + cleanPhone.slice(-2);
        };

        // معالجة أرقام البطاقات - لإظهارها بشكل ********1234 في الPDF
        const formatIdPDF = (id: string): string => {
          if (!id) return 'غير متوفر';
          const cleanId = id.replace(/\D/g, '');
          if (cleanId.length <= 4) return cleanId;
          return '*'.repeat(cleanId.length - 4) + cleanId.slice(-4);
        };
        
        // تجهيز البيانات للعرض في الPDF
        const sellerPhone = formatPhonePDF(record.seller_phone || t('no_phone'));
        const buyerPhone = formatPhonePDF(record.buyer_phone || t('no_phone'));
        
        const sellerIdInfo = isSellerBusiness(record) ? 'متجر' : 
          (record.seller_id_last6 ? formatIdPDF(record.seller_id_last6) : 'غير متوفر');
        
        const buyerIdInfo = isBuyerBusiness(record) ? 'متجر' : 
          (record.buyer_id_last6 ? formatIdPDF(record.buyer_id_last6) : 'غير متوفر');
        
        // جمع البيانات بالتنسيق المطلوب للعرض
        const sellerInfo = `${sellerName} (${sellerPhone})`;
        const buyerInfo = record.buyer_name ? `${buyerName} (${buyerPhone})` : t('no_buyer_data');

        return [
          formattedDate,
          processArabicText(sellerInfo),
          processArabicText(sellerIdInfo),
          processArabicText(buyerInfo),
          processArabicText(buyerIdInfo)
        ];
      });

      // تحديد موضع بداية الجدول
      const tableStartY = 120;
      
      // استخدام اسم الخط الذي تم تحديده (Amiri أو helvetica)
      // تنسيق الجدول بشكل أكثر احترافية
      autoTable(doc, {
        head: headers,
        body,
        startY: tableStartY,
        // إعدادات أساسية
        styles: { 
          font: fontForTable, 
          halign: 'center', 
          fontSize: 11,
          cellPadding: 6,
          lineWidth: 0.2,
          lineColor: [80, 80, 80]
        },
        // تنسيق رؤوس الأعمدة
        headStyles: { 
          font: fontForTable, 
          halign: 'center', 
          fontSize: 13, 
          fontStyle: 'bold',
          fillColor: [25, 118, 210], // خلفية زرقاء للرؤوس
          textColor: [255, 255, 255], // نص أبيض للرؤوس
          cellPadding: 8 // تباعد أكبر في رؤوس الأعمدة
        },
        // تنسيق الصفوف
        alternateRowStyles: { fillColor: [240, 247, 255] }, // لون خلفية متناوب للصفوف
        // هوامش الجدول
        margin: { top: 5, right: margin, bottom: 5, left: margin },
        // تنسيق حدود الخلايا
        bodyStyles: { lineWidth: 0.2, lineColor: [150, 150, 150] },
        // توسيط الجدول
        tableWidth: 'auto', // يضبط عرض الجدول تلقائياً
        columnStyles: {
          // تخصيص عرض الأعمدة حسب المحتوى
          0: { cellWidth: 'auto' }, // تاريخ
          1: { cellWidth: 'auto' }, // بائع
          2: { cellWidth: 'auto' }, // رقم هوية البائع
          3: { cellWidth: 'auto' }, // مشتري
          4: { cellWidth: 'auto' }  // رقم هوية المشتري
        }
      });

      // --- File Saving (Platform-specific) ---
      const fileName = `transfer_history_${imei}.pdf`;
      if (Capacitor.isNativePlatform()) {
        // Mobile (Capacitor) implementation:
        // 1. Save the file to a temporary cache directory.
        // 2. Use the Share plugin to open the native share sheet with the file URI.
        // This is more reliable than passing a data URI directly.
        try {
          const base64Data = doc.output('datauristring').split(',')[1];

          // Write the file to the app's cache directory. This doesn't require special permissions.
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true
          });

          await Share.share({
            title: fileName,
            text: t('pdf_document_for_transfer_history'),
            url: result.uri, // Use the file URI from Filesystem.writeFile
            dialogTitle: t('share_or_save_pdf'),
          });
        } catch (e: any) {
          console.error('Unable to write or share PDF file', e);
          // The share promise rejects if the user cancels the share dialog.
          // We can ignore this specific error as it's not a technical failure.
          if (e.message && e.message.includes('Share canceled')) {
            // User cancelled the share sheet, do nothing.
          } else {
            toast({ title: t('error'), description: t('error_sharing_pdf'), variant: 'destructive' });
          }
        }
      } else {
        // Web implementation (triggers download in browser)
        doc.save(fileName);
      }

    } catch (error) {
      console.error('Failed to generate PDF. Error details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: t('error_generating_pdf'), description: errorMessage, variant: 'destructive' });
    }
  };

  return (
    <PageContainer>
      <AppNavbar />
      <div className="container mx-auto p-4 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">{t('transfer_history')}</h1>
          <BackButton />
        </div>
        <div className="mb-4 space-y-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder={t('search_by_imei_or_phone')}
              className="pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm border border-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchPhoneDetails(searchTerm)}
              className="bg-orange-500 hover:bg-orange-600 text-white transition-colors flex-1"
              disabled={searchTerm.length !== 15 || isLoading}
            >
              <Search className="h-4 w-4 mr-2" />
              {t('search')}
            </Button>
            <Button
              onClick={() => generatePdf(records, searchTerm, phoneImage)}
              className="bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-1"
              disabled={isLoading || records.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t('print_pdf')}
            </Button>
          </div>
          {phoneImage && (
            <div className="mt-4">
              <h3 className="text-lg font-bold text-white mb-2">{t('latest_phone_image')}</h3>
              <button
                onClick={() => {
                  setSelectedImage(phoneImage);
                  setIsImageViewerOpen(true);
                }}
                className="cursor-pointer block"
              >
                <img
                  src={phoneImage}
                  alt="Phone"
                  className="w-full max-w-sm rounded-lg border border-gray-700 shadow-lg transition-transform hover:scale-[1.02]"
                />
              </button>
            </div>
          )}
          
          {/* مكون عارض الصور */}
          <ImageViewer
            imageUrl={selectedImage || ''}
            isOpen={isImageViewerOpen}
            onClose={() => setIsImageViewerOpen(false)}
          />
        </div>
        {searchTerm.length === 15 && (
          <>
            {isLoading && <p className="text-center text-white">{t('loading')}...</p>}
            {!isLoading && records.length === 0 && (
              <p className="text-center text-white">{t('no_records_found')}</p>
            )}
            {!isLoading && records.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-800">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-6 py-3 border border-gray-700 text-left text-sm font-medium uppercase tracking-wider">{t('date')}</th>
                      <th className="px-6 py-3 border border-gray-700 text-left text-sm font-medium uppercase tracking-wider">{t('seller')}</th>
                       <th className="px-6 py-3 border border-gray-700 text-left text-sm font-medium uppercase tracking-wider">{t('seller_id') || 'رقم بطاقة البائع'}</th>
                      <th className="px-6 py-3 border border-gray-700 text-left text-sm font-medium uppercase tracking-wider">{t('buyer')}</th>
                       <th className="px-6 py-3 border border-gray-700 text-left text-sm font-medium uppercase tracking-wider">{t('buyer_id') || 'رقم بطاقة المشتري'}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 border border-gray-700 text-sm text-gray-300">{format(new Date(record.date), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4 border border-gray-700 text-sm text-gray-300">
                          {maskName(record.seller_name)} ({maskPhone(record.seller_phone)})
                        </td>
                        <td className="px-6 py-4 border border-gray-700 text-sm text-gray-300">
                          {isSellerBusiness(record) ? 'متجر' : (record.seller_id_last6 ? maskIdNumber(record.seller_id_last6) : 'غير متوفر')}
                        </td>
                        <td className="px-6 py-4 border border-gray-700 text-sm text-gray-300">
                          {record.buyer_name ? `${maskName(record.buyer_name)} (${maskPhone(record.buyer_phone || t('no_phone'))})` : t('no_buyer_data')}
                        </td>
                        <td className="px-6 py-4 border border-gray-700 text-sm text-gray-300">
                          {isBuyerBusiness(record) ? 'متجر' : (record.buyer_id_last6 ? maskIdNumber(record.buyer_id_last6) : 'غير متوفر')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default TransferHistory;