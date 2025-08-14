import { supabase } from '../lib/supabase';

/**
 * وظيفة مساعدة لتخزين رقم بطاقة البائع في جدول transfer_records
 * 
 * @param imei رقم IMEI للهاتف
 * @param sellerId رقم بطاقة البائع (آخر 6 أرقام)
 * @returns وعد بنتيجة العملية (نجاح/فشل)
 */
export const storeSellerIdForTransfer = async (imei: string, sellerId: string): Promise<boolean> => {
  if (!imei) return false;

  // التأكد من القيمة
  const idToStore = sellerId?.trim() || 'غير متوفر';
  console.log('🔄 محاولة تخزين رقم بطاقة البائع:', idToStore, 'للهاتف IMEI:', imei);

  try {
    // الحصول على آخر سجل نقل لهذا IMEI
    const { data: latestTransfer, error: fetchError } = await supabase
      .from('transfer_records')
      .select('id, created_at, imei, seller_id_last6')
      .eq('imei', imei)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !latestTransfer) {
      console.error('❌ لم يتم العثور على سجل نقل:', fetchError || 'بيانات غير موجودة');

      // محاولة إنشاء سجل جديد
      return await createNewTransferRecord(imei, idToStore);
    }

    // تحديث السجل الموجود
    console.log('✅ تم العثور على سجل النقل:', latestTransfer);

    // تحقق إذا كان الحقل فارغًا
    if (!latestTransfer.seller_id_last6) {
      const { data, error } = await supabase
        .from('transfer_records')
        .update({ seller_id_last6: idToStore })
        .eq('id', latestTransfer.id)
        .select();

      if (error) {
        console.error('❌ فشل تحديث سجل النقل:', error);
        return false;
      }

      console.log('✅ تم تحديث سجل النقل بنجاح:', data);
      return true;
    } else {
      console.log('ℹ️ سجل النقل يحتوي بالفعل على رقم بطاقة البائع:', latestTransfer.seller_id_last6);
      return true;
    }
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء تخزين رقم بطاقة البائع:', error);
    return false;
  }
};

/**
 * إنشاء سجل نقل جديد في حالة عدم وجود سجل
 * 
 * @param imei رقم IMEI للهاتف
 * @param sellerId رقم بطاقة البائع
 * @returns وعد بنتيجة العملية (نجاح/فشل)
 */
const createNewTransferRecord = async (imei: string, sellerId: string): Promise<boolean> => {
  try {
    // جلب بيانات الهاتف من جدول registered_phones للحصول على المعلومات الضرورية
    const { data: phoneData, error: phoneError } = await supabase
      .from('registered_phones')
      .select('owner_name, phone_number')
      .eq('imei', imei)
      .single();

    if (phoneError || !phoneData) {
      console.error('❌ لم يتم العثور على بيانات الهاتف المسجل:', phoneError);
      return false;
    }

    // إنشاء سجل نقل جديد
    const { data, error } = await supabase
      .from('transfer_records')
      .insert([
        {
          imei: imei,
          seller_id_last6: sellerId,
          seller_name: phoneData.owner_name,
          seller_phone: phoneData.phone_number,
          transfer_date: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('❌ فشل إنشاء سجل نقل جديد:', error);

      // محاولة أخيرة - حفظ في جدول مخصص
      return await storeInBackupTable(imei, sellerId);
    }

    console.log('✅ تم إنشاء سجل نقل جديد بنجاح:', data);
    return true;
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء إنشاء سجل نقل جديد:', error);

    // محاولة الحفظ في جدول احتياطي
    return await storeInBackupTable(imei, sellerId);
  }
};

/**
 * تخزين رقم بطاقة البائع في جدول احتياطي
 * (يُستخدم فقط في حالة فشل جميع المحاولات السابقة)
 * 
 * @param imei رقم IMEI للهاتف
 * @param sellerId رقم بطاقة البائع
 * @returns وعد بنتيجة العملية (نجاح/فشل)
 */
const storeInBackupTable = async (imei: string, sellerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('seller_id_backup')
      .upsert([
        {
          imei: imei,
          seller_id_last6: sellerId,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'imei' })
      .select();

    if (error) {
      console.error('❌ فشل تخزين رقم البطاقة في الجدول الاحتياطي:', error);
      return false;
    }

    console.log('✅ تم تخزين رقم البطاقة في الجدول الاحتياطي بنجاح:', data);
    return true;
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء تخزين رقم البطاقة في الجدول الاحتياطي:', error);
    return false;
  }
};

/**
 * وظيفة للبحث عن رقم بطاقة البائع باستخدام IMEI
 * 
 * @param imei رقم IMEI للهاتف
 * @returns وعد برقم بطاقة البائع أو نص فارغ
 */
export const getSellerIdByImei = async (imei: string): Promise<string> => {
  if (!imei) return '';

  try {
    // البحث في جدول سجلات النقل أولاً
    const { data: transferData, error: transferError } = await supabase
      .from('transfer_records')
      .select('seller_id_last6')
      .eq('imei', imei)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!transferError && transferData?.seller_id_last6) {
      return transferData.seller_id_last6;
    }

    // إذا لم يتم العثور على البيانات، ابحث في الجدول الاحتياطي
    const { data: backupData, error: backupError } = await supabase
      .from('seller_id_backup')
      .select('seller_id_last6')
      .eq('imei', imei)
      .single();

    if (!backupError && backupData?.seller_id_last6) {
      return backupData.seller_id_last6;
    }

    return '';
  } catch (error) {
    console.error('❌ خطأ أثناء البحث عن رقم بطاقة البائع:', error);
    return '';
  }
};
