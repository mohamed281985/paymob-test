import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Contexts
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useScrollToTop } from '../hooks/useScrollToTop';

// UI Components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Icons
import { Eye, EyeOff, Mail, Lock, User, Phone, CreditCard } from 'lucide-react';

// Custom Components
import PageContainer from '../components/PageContainer';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';
import { supabase } from '../lib/supabase';

interface SignupFormData {
  email: string;
  username: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  idLast6: string;
}

const Signup: React.FC = () => {
  useScrollToTop();
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    username: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    idLast6: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    // السماح بالأرقام فقط لرقم الهاتف ورقم البطاقة
    if (name === 'phoneNumber' || name === 'idLast6') {
      processedValue = value.replace(/\D/g, '');
    }
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setSignupError(null);
      const { email, password, confirmPassword, username, phoneNumber, idLast6 } = formData;

      if (password !== confirmPassword) {
        setSignupError(t('passwords_dont_match'));
        setIsSubmitting(false);
        return;
      }
      
      if (idLast6.length !== 6) {
        setSignupError('يجب إدخال آخر 6 أرقام من البطاقة الشخصية بشكل صحيح.');
        setIsSubmitting(false);
        return;
      }

      const result = await signup(email, password, username, phoneNumber, idLast6);

      if (result === 'email_exists') {
        setSignupError('هذا البريد مسجل من قبل');
        setIsSubmitting(false);
        return;
      }
      
      if (result === 'success') {
        toast({
          title: t('signup_successful'),
          description: t('verification_email_sent')
        });
        navigate('/login');
      } else {
        setSignupError(t('signup_error'));
      }
      
      setIsSubmitting(false);
};

  return (
    <PageContainer>
      <div className="container mx-auto px-4 py-8 bg-imei-dark min-h-screen">
        
        <Card className="shadow-lg border-t-4 border-t-orange-500 bg-imei-dark/50 backdrop-blur-sm max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-orange-600 text-center">
              <Logo size="lg" className="mb-6" />
              
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {signupError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{signupError}</span>
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-12 justify-between mb-8">
                <BackButton className="ml-4" />
                <h1 className="text-2xl font-bold text-orange-600 flex-grow text-center">
                  إنشاء حساب
                </h1>
              </div>
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
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="username" className="block text-white text-sm font-medium mb-1">
                  {t('username')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input-field pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm"
                    placeholder="الاسم الحقيقي"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="idLast6" className="block text-white text-sm font-medium mb-1">
                  آخر 6 أرقام من البطاقة الشخصية
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard size={18} className="text-gray-400" />
                  </div>
                  <Input
                    id="idLast6"
                    type="text"
                    name="idLast6"
                    value={formData.idLast6}
                    onChange={handleInputChange}
                    className="input-field pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm"
                    placeholder="******"
                    required
                    maxLength={6}
                  />
                </div>
              </div>
              
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
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="input-field pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm"
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>
              </div>
              
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
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-field pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm"
                    placeholder="********"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-white text-sm font-medium mb-1">
                  {t('confirm_password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field pl-10 w-full focus:ring-2 focus:ring-orange-500 bg-imei-dark/50 backdrop-blur-sm"
                    placeholder="********"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('loading') : t('signup')}
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-300 mt-4">
                {t('already_have_account')}{' '}
                <Link to="/login" className="text-orange-500 hover:underline">
                  {t('login')}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Signup;
