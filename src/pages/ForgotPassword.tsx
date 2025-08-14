import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from '../components/Logo';
import PageContainer from '../components/PageContainer';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'myapp://auth'
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني إذا كان مسجلاً.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-10">
          <Logo size="lg" />
        </div>
        
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold mb-2 text-center">
            {t('forgot_password')}
          </h1>
          <p className="text-gray-300 text-center">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.
          </p>
        </div>
        
        <form onSubmit={sendResetPassword} className="space-y-4 max-w-xs mx-auto">
          <input
            type="email"
            className="w-full px-3 py-2 rounded border border-gray-400 focus:outline-none focus:border-imei-cyan"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full bg-imei-cyan text-white font-bold py-2 px-4 rounded hover:bg-cyan-600 transition"
            disabled={loading}
          >
            {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </button>
        </form>
        
        {message && <div className="text-green-500 text-center mt-4">{message}</div>}
        {error && <div className="text-red-500 text-center mt-4">{error}</div>}
        
        <div className="text-center">
          <Link to="/login" className="text-imei-cyan hover:underline flex items-center justify-center mt-4">
            <ArrowLeft size={16} className="mr-1" /> العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};

export default ForgotPassword;
