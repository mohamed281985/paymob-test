import React, { useState, useCallback, useEffect } from 'react'; // إضافة useEffect
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Search, ArrowLeft, Smartphone, FileText, CheckCircle } from 'lucide-react'; // إضافة CheckCircle
import PageContainer from '@/components/PageContainer'; // تأكد من أن PageContainer يُستخدم أو أزله إذا لم يكن كذلك
import AppNavbar from '@/components/AppNavbar'; // استيراد AppNavbar
import PageAdvertisement from '@/components/advertisements/PageAdvertisement'; // استيراد PageAdvertisement
import { useScrollToTop } from '../hooks/useScrollToTop';

import { Filesystem, Directory } from '@capacitor/filesystem';

import { supabase } from '../lib/supabase';

const WelcomeSearch: React.FC = () => {
  useScrollToTop();
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [imei, setImei] = useState('');
  const [searchResult, setSearchResult] = useState<'found' | 'not_found' | null>(null);
  const [phoneId, setPhoneId] = useState<string | null>(null);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [phoneImagePreview, setPhoneImagePreview] = useState<string | null>(null);
  const [invoiceImagePreview, setInvoiceImagePreview] = useState<string | null>(null); // لم يتم استخدامه حاليًا
  // إضافة حالة لتخزين تفاصيل الهاتف المسجل
  const [registeredPhoneDetails, setRegisteredPhoneDetails] = useState<any | null>(null);
  const [foundReport, setFoundReport] = useState<any | null>(null); // لتخزين تفاصيل البلاغ المعثور عليه


  const handleImeiChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length > 15) return;
    setImei(value);
  }, []);

  // تأثير لتحميل البيانات والبحث عند تحميل المكون لأول مرة
  useEffect(() => {
    // يمكن ترك هذا التأثير فارغًا أو استخدامه لعمليات أخرى لا تعتمد على localStorage
    // إذا كنت ترغب في مسح النتائج عند تحميل الصفحة بدون IMEI، يمكنك القيام بذلك هنا.
    if (!imei) {
      setSearchResult(null);
      setPhoneId(null);
      setRegisteredPhoneDetails(null);
      setFoundReport(null);
      setPhoneImagePreview(null);
      setReportImagePreview(null);
    }
  }, [imei]); // يعتمد على imei لمسح النتائج إذا أصبح فارغًا

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imei) {
      toast({
        title: t('error'),
        description: t('please_enter_imei'),
        variant: 'destructive'
      });
      return;
    }

    if (!/^\d{14,15}$/.test(imei)) {
      toast({
        title: t('error'),
        description: t('invalid_imei'),
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);

    try {
      setSearchResult(null);
      setRegisteredPhoneDetails(null);
      setPhoneId(null);
      setFoundReport(null);
      setPhoneImagePreview(null);
      setReportImagePreview(null);

      // البحث في كلا الجدولين معاً
      // 1. جلب بيانات الهاتف المسجل
      const { data: regPhone, error: regError } = await supabase
        .from('registered_phones')
        .select('imei, registration_date, status, phone_image_url')
        .eq('imei', imei)
        .maybeSingle();

      if (regError) {
        console.error('Error fetching registered phone from Supabase:', regError);
        throw regError;
      }

      // 2. جلب بيانات البلاغ (إن وجد)
      const { data: reportedPhoneData, error: reportError } = await supabase
        .from('phone_reports')
        .select('*')
        .eq('imei', imei)
        .maybeSingle();

      if (reportError) {
        console.error('Error fetching phone report from Supabase:', reportError);
        throw reportError;
      }

      // أولوية العرض: إذا هناك بلاغ، اعرض بيانات البلاغ
      if (reportedPhoneData) {
        setPhoneId(reportedPhoneData.id);
        setSearchResult('found');
        setFoundReport(reportedPhoneData);
        // تعيين صورة الهاتف من البلاغ أو من التسجيل
        setPhoneImagePreview(reportedPhoneData.phone_image_url || regPhone?.phone_image_url || null);
        // تعيين صورة المحضر إذا كانت موجودة في البلاغ
        if (reportedPhoneData.report_image_url) {
          console.log("تم العثور على صورة محضر:", reportedPhoneData.report_image_url);
          setReportImagePreview(reportedPhoneData.report_image_url);
        }
        // إذا كان الهاتف أيضاً مسجلاً، احتفظ بالتفاصيل
        if (regPhone) setRegisteredPhoneDetails(regPhone);
      } else if (regPhone) {
        setRegisteredPhoneDetails(regPhone);
        setSearchResult('not_found');
        if (regPhone.phone_image_url) {
          setPhoneImagePreview(regPhone.phone_image_url);
        }
      } else {
        setSearchResult('not_found');
        setRegisteredPhoneDetails(null);
        toast({
          title: t('info'),
          description: t('phone_not_found'),
        });
      }
    } catch (error) {
      if (error && error.message) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          code: error.code
        });
      }
      toast({
        title: t('error'),
        description: t('error_searching'),
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };


  return (
    <PageContainer>
      <AppNavbar />
      <PageAdvertisement pageName="welcomesearch" />
      <div className="container mx-auto px-4 py-8 bg-imei-dark min-h-screen">
        <div className="my-6 flex-1 flex flex-col">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/welcome')}
              className="bg-orange-500 p-2 rounded-full hover:bg-orange-600 transition-colors mr-4"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <h1 className="text-white text-2xl font-bold text-center flex-1 pr-10">
              {t('search_imei')}
            </h1>
          </div>
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={imei}
                  onChange={handleImeiChange}
                  placeholder="12345789012345"
                  className="w-full pl-10 py-3 bg-imei-darker border border-imei-cyan/30 rounded-lg text-white focus:border-imei-cyan focus:ring-1 focus:ring-imei-cyan"
                  maxLength={15}
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-cyan-400 hover:bg-cyan-500 py-3 text-lg font-medium flex items-center justify-center gap-2 shadow-lg transition-all duration-300"
                disabled={isSearching}
              >
                <Search className="w-5 h-5 text-blue-900" />
                <span className="text-blue-900">{t('search')}</span>
              </Button>
            </form>

            {/* إخفاء أيقونة الهاتف والجملة عند ظهور نتيجة البحث */}
            {searchResult === null && (
              <div className="flex flex-col items-center justify-center mt-8 space-y-2">
                <Smartphone className="text-gray-500" width={48} height={48} />
                <p className="text-gray-400 text-center">{t('enter_imei')}</p>
              </div>
            )}

            {/* عرض حالة الهاتف بناءً على النتيجة والحالة */}
            {searchResult === 'found' && foundReport && (
              <div className={`mt-8 p-6 rounded-xl border ${foundReport.status === 'resolved' ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                <div className="flex items-center justify-center mb-4">
                   {foundReport.status === 'resolved' ? (
                     <CheckCircle size={48} className="text-green-500" />
                   ) : (
                     <AlertTriangle size={48} className="text-red-500" />
                   )}
                </div>
                <h3 className={`text-xl font-bold text-center mb-2 ${foundReport.status === 'resolved' ? 'text-green-500' : 'text-red-500'}`}>
                   {foundReport.status === 'resolved' ? t('phone_found') : t('phone_lost')} {/* استخدم مفاتيح الترجمة الموجودة أو أضف جديدة إذا لزم الأمر */}
                </h3>
                <p className={`text-center ${foundReport.status === 'resolved' ? 'text-green-200' : 'text-red-200'}`}>
                   {foundReport.status === 'resolved' ? t('phone_found_message') : t('phone_lost_message')} {/* استخدم مفاتيح الترجمة التي أضفناها سابقًا */}
                </p>

                {/* إضافة رقم الإيمي، تاريخ البلاغ، وتاريخ الحل هنا */}
                <div className="text-center text-white mb-2">
                  <span className="font-bold">IMEI:</span> {foundReport.imei}
                </div>
                <div className="text-center text-white mb-2">
                  <span className="font-bold">{t('report_date') || 'تاريخ البلاغ'}:</span> {foundReport.report_date ? new Date(foundReport.report_date).toLocaleString('ar-EG') : '-'}
                </div>
                {foundReport.status === 'resolved' && (
                  <div className="text-center text-green-300 mb-2">
                    <span className="font-bold">{t('resolved_date') || 'تاريخ الحل'}:</span> {
                      foundReport.resolved_date
                        ? new Date(foundReport.resolved_date).toLocaleString('ar-EG')
                        : foundReport.resolvedDate
                          ? new Date(foundReport.resolvedDate).toLocaleString('ar-EG')
                          : foundReport.updated_at
                            ? new Date(foundReport.updated_at).toLocaleString('ar-EG')
                            : '-'
                    }
                  </div>
                )}
              </div>
            )}

            {/* عرض حالة الهاتف المسجل */}
            {searchResult === 'not_found' && registeredPhoneDetails && (
  <>
    {registeredPhoneDetails.status === 'pending' ? (
      // حالة "تحت المراجعة" - تم تغييرها إلى الأخضر المتوهج
      <div className="mt-8 p-6 rounded-xl border bg-green-500/10 border-green-500/50 shadow-lg shadow-green-500/30">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle size={48} className="text-green-500" /> {/* تغيير الأيقونة ولونها */}
        </div>
        <h3 className="text-xl font-bold text-center mb-2 text-green-500"> {/* تغيير لون النص */}
          {t('this_phone_is_registered_in_our_system_since')}{' '} {/* النص يبقى كما هو */}
          {new Date(registeredPhoneDetails.registration_date).toLocaleString('ar-EG')}{' '}
          {t('and_it_is_under_review_please_check_purchase_invoice')}
        </h3>
      </div>
    ) : registeredPhoneDetails.status === 'rejected' ? (
      // حالة "مرفوض" - المربع الأحمر المتوهج
      <div className="mt-8 p-6 rounded-xl border bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/30">
        <div className="flex items-center justify-center mb-4">
          <AlertTriangle size={48} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-center mb-2 text-red-500">
          {t('this_phone_registration_has_been_rejected_due_to_incorrect_data')}
        </h3>
      </div>
    ) : (
      // حالة "مسجل" (ولكن ليس تحت المراجعة أو مرفوض، مثال: 'approved' أو 'active')
      <div className="mt-8 p-6 rounded-xl border bg-green-500/10 border-green-500/50">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-center mb-2 text-green-500">
          {t('this_phone_is_registered_in_our_system_since')}{' '}
          {new Date(registeredPhoneDetails.registration_date).toLocaleString('ar-EG')}{' '}
          {t('and_no_report_has_been_filed_yet')}
        </h3>
      </div>
    )}
  </>
)}

             {/* إضافة صورة الهاتف هنا */}
             {phoneImagePreview && (
               <div className="p-4 bg-imei-darker rounded-xl border border-imei-cyan/20">
                 <h3 className="text-imei-cyan font-medium mb-2">{t('phone_image')}</h3>
                 <img
                   src={phoneImagePreview} // سيتم تعيين هذا من regPhone.phone_image_url
                   alt={t('phone_image')}
                   className="w-full h-auto rounded-lg"
                   onError={(e) => {
                     e.currentTarget.src = '/placeholder.svg';
                   }}
                 />
               </div>
            )}

            {/* عرض صورة المحضر فقط عندما يكون هناك بلاغ نشط */}
            {searchResult === 'found' && foundReport && foundReport.status === 'active' && reportImagePreview && (
              <div className="mt-4 p-4 bg-imei-darker rounded-xl border border-red-500/50">
                <h3 className="text-red-400 font-medium mb-2">{t('report_image') || 'صورة المحضر'}</h3>
                <img
                  src={reportImagePreview}
                  alt={t('report_image')}
                  className="w-full h-auto rounded-lg"
                  onError={(e) => {
                    console.log("خطأ في تحميل صورة المحضر");
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
            )}

            {/* أزرار تفاصيل الهاتف وإبلاغ صاحب الهاتف */}
            {searchResult === 'found' && foundReport && ( // عرض الأزرار فقط إذا تم العثور على بلاغ
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  onClick={() => navigate(`/phone/${phoneId}`)} // إضافة دالة onClick هنا
                  className="flex-1 h-12 bg-cyan-400 hover:bg-cyan-500 text-blue-900 transition-all duration-300 text-base font-semibold shadow-md hover:shadow-lg rounded-md flex items-center justify-center gap-2"
                >
                  <FileText className="h-5 w-5" />
                  {t('phone_details')}
                </Button>

                {/* زر الإبلاغ عن المالك يظهر فقط إذا كان الهاتف مفقوداً (active) */}
                {foundReport.status === 'active' && (
                   <Button
                     onClick={() => {
                       toast({
                         title: t('notification_sent'),
                         description: t('owner_notified_success'),
                       });
                     }}
                     className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white transition-all duration-300 text-base font-semibold shadow-md hover:shadow-lg rounded-md flex items-center justify-center gap-2"
                   >
                     <AlertTriangle className="h-5 w-5" />
                     {t('notify_owner')}
                   </Button>
                )}
              </div>
            )}

            {/* عرض رسالة "الهاتف غير مسجل" فقط إذا لم يتم العثور على بلاغ أو هاتف مسجل */}
            {searchResult === 'not_found' && !registeredPhoneDetails && (
              <div className="mt-8 p-6 bg-imei-darker rounded-xl border border-imei-cyan/20">
                <p className="text-imei-cyan text-lg text-center">{t('phone_not_found_message')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default WelcomeSearch;
