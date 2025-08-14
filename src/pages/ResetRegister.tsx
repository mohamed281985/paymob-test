import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import AppNavbar from '@/components/AppNavbar';
import BackButton from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ResetRegister() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const imei = location.state?.imei; // جلب رقم IMEI من الحالة

  const handleReset = async () => {
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      setLoading(false);
      return;
    }

    if (imei) {
      // --- السلوك الجديد: إعادة تعيين كلمة مرور الهاتف ---
      try {
        const { error: updateError } = await supabase
          .from('registered_phones')
          .update({ password: password })
          .eq('imei', imei)
          .select();

        if (updateError) {
          setError('❌ فشل تحديث كلمة المرور: ' + updateError.message);
        } else {
          toast({
            title: 'نجاح',
            description: 'تم تحديث كلمة مرور الهاتف بنجاح. سيتم توجيهك الآن.',
          });
          setTimeout(() => navigate('/report', { state: { imei } }), 2000);
        }
      } catch (e: any) {
        setError('حدث خطأ غير متوقع: ' + e.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError('خطأ: رقم IMEI غير موجود. لا يمكن المتابعة.');
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <AppNavbar />
      <div className="flex items-center mb-6 gap-4">
        <BackButton />
        <h1 className="text-2xl font-bold text-white">إعادة تعيين كلمة مرور الهاتف</h1>
      </div>

      <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        <div className="space-y-6">
          <p className="text-center text-gray-300">
            أنت تقوم بتغيير كلمة المرور للهاتف المرتبط بالرقم التسلسلي:
            <span className="font-bold text-cyan-400 block mt-2">{imei}</span>
          </p>
          
          <div className="space-y-2">
            <label htmlFor="password" className="block text-white font-medium mb-1">
              كلمة المرور الجديدة
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              placeholder="********"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-white font-medium mb-1">
              تأكيد كلمة المرور الجديدة
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full"
              placeholder="********"
              disabled={loading}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button onClick={handleReset} className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
            {loading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
