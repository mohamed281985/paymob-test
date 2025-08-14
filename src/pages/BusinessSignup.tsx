import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { Mail, Store, User, Phone, MapPin, Briefcase, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BusinessSignup() {
  const [formData, setFormData] = useState({
    email: '',
    storeName: '',
    ownerName: '',
    phone: '',
    address: '',
    businessType: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // تحقق من كلمة المرور
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'خطأ في التحقق',
        description: 'كلمتا المرور غير متطابقتين. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      toast({
        title: 'كلمة مرور ضعيفة',
        description: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // 1. تسجيل المستخدم في Supabase Auth
      // سيقوم التريجر في قاعدة البيانات بإنشاء سجل في جدول businesses تلقائيًا
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName,
            phone: formData.phone,
            role: 'business',
            // إضافة البيانات الإضافية هنا ليستخدمها التريجر
            store_name: formData.storeName,
            address: formData.address,
            business_type: formData.businessType,
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (signUpError) throw new Error(signUpError.message);
      if (!user) throw new Error("User registration failed, user not found.");

      // تم حذف الخطوة 2 (upsert) لأنها ستتم الآن عبر التريجر في قاعدة البيانات

      toast({
        title: 'تم التسجيل بنجاح!',
        description: 'تم إرسال رابط تأكيد إلى بريدك. يرجى النقر عليه ثم تسجيل الدخول للمتابعة.',
        duration: 9000,
      });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center p-4">
      <Logo size="lg" className="mb-8" />
      <Card className="w-full max-w-md p-6 shadow-lg bg-gray-800 border border-gray-700">
        <h1 className="text-2xl font-semibold mb-6 text-center text-orange-500">تسجيل حساب تجاري</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-white text-sm font-medium mb-1">البريد الإلكتروني</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="البريد الإلكتروني"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="storeName" className="block text-white text-sm font-medium mb-1">اسم المحل</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Store size={18} className="text-gray-400" />
              </div>
              <Input
                id="storeName"
                name="storeName"
                placeholder="اسم المحل"
                value={formData.storeName}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="ownerName" className="block text-white text-sm font-medium mb-1">اسم صاحب المحل</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <Input
                id="ownerName"
                name="ownerName"
                placeholder="اسم صاحب المحل"
                value={formData.ownerName}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-white text-sm font-medium mb-1">رقم الهاتف</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={18} className="text-gray-400" />
              </div>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="رقم الهاتف"
                value={formData.phone}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="address" className="block text-white text-sm font-medium mb-1">عنوان المحل</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin size={18} className="text-gray-400" />
              </div>
              <Input
                id="address"
                name="address"
                placeholder="عنوان المحل"
                value={formData.address}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="businessType" className="block text-white text-sm font-medium mb-1">نوع النشاط</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase size={18} className="text-gray-400" />
              </div>
              <Input
                id="businessType"
                name="businessType"
                placeholder="نوع النشاط"
                value={formData.businessType}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-white text-sm font-medium mb-1">كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="6 أحرف على الأقل"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-white text-sm font-medium mb-1">تأكيد كلمة المرور</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="تأكيد كلمة المرور"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="bg-gray-700 text-white pl-10"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full text-white text-lg font-large py-90 bg-orange-500 hover:bg-orange-600">
            {loading ? 'جاري التسجيل...' : 'تسجيل'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
