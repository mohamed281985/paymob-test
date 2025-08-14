import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Eye, EyeOff, Mail, Lock, Phone, Fingerprint } from 'lucide-react'; // Added Fingerprint
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// إضافة prop لإخفاء حقل رقم الهاتف
interface LoginFormProps {
  hidePhoneField?: boolean;
  biometricButton?: React.ReactNode; // Add this prop
}

export function LoginForm({
  hidePhoneField,
  biometricButton,
}: LoginFormProps) {
  const { login, error } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect');
  
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      toast({
        title: "حسابات تجريبية",
        description: "يمكنك استخدام: user@example.com / password أو maly5424@gmail.com / password"
      });
      
      const result = await login(email, password, rememberMe);
      
      if (result.success) {
        toast({
          title: t('login_successful'),
          description: t('welcome_back')
        });

        if (result.needsProfileCompletion) {
          toast({
            title: 'إكمال الملف الشخصي',
            description: 'يرجى إكمال بياناتك التجارية للمتابعة.',
            variant: 'destructive',
          });
          navigate('/business-profile-complete', { replace: true });
        } else {
          if (redirect) {
            navigate(redirect, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        setLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        toast({
          title: t('login_failed'),
          description: t('invalid_credentials'),
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('حدث خطأ غير متوقع');
      toast({
        title: t('login_error'),
        description: t('unexpected_error'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Placeholder for handleFingerprintLogin function
  const handleFingerprintLogin = () => {
    toast({
      title: "بصمة الإصبع",
      description: "وظيفة تسجيل الدخول ببصمة الإصبع غير متوفرة حاليًا."
    });
    // Implement your fingerprint login logic here
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {loginError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}

      <div>
        <label htmlFor="email" className="block text-white text-sm font-medium mb-1">
          {t('email')}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail size={18} className="text-gray-400" />
          </div>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field pl-10 w-full"
            placeholder="user@example.com"
            required
          />
        </div>
      </div>
      {/* إخفاء حقل رقم الهاتف إذا كان hidePhoneField = true */}
      {!hidePhoneField && (
        <div>
          <label htmlFor="phoneNumber" className="block text-white text-sm font-medium mb-1">
            {t('phone_number')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={18} className="text-gray-400" />
            </div>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="input-field pl-10 w-full"
              placeholder="+1234567890"
            />
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="password" className="block text-white text-sm font-medium mb-1">
          {t('password')}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock size={18} className="text-gray-400" />
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field pl-10 pr-10 w-full"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={18} className="text-gray-400" />
            ) : (
              <Eye size={18} className="text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm">
          {t(error)}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-imei-cyan focus:ring-imei-cyan"
          />
          <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-300">
            {t('remember_me')}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          type="submit" 
          className="flex-1 text-lg bg-imei-cyan hover:bg-imei-cyan/90 text-white shadow-lg shadow-imei-cyan/50 transition-all duration-300 ease-in-out transform hover:scale-105"
        >
          {t("تسجيل الدخول")}
        </Button>
        {biometricButton && (
          <div className="text-4xl">
            {biometricButton}
          </div>
        )} 
      </div>
    </form>
  );
}

export default LoginForm;
