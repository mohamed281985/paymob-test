
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

const AuthLinks = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* تم نقل زر نسيت كلمة المرور إلى AppNavbar */}
      
      <Card className="p-4 mt-4 bg-gray-800 border border-gray-700">
        <div className="mt-4 space-y-8 text-center">
          <p className="text-l text-gray-300">ليس لديك حساب؟</p>
          <div className="flex gap-4">
            <Link
              to="/signup"
              className="text-l font-medium text-white hover:bg-orange-500 hover:text-gray-900 px-6 py-2 rounded transition-all duration-200"
            >
              حساب مستخدم
            </Link>
            <span className="text-gray-400 mx-2">|</span>
            <Link 
              to="/business-signup"
              className="text-l font-medium text-white hover:bg-orange-500 hover:text-gray-900 px-6 py-2 rounded transition-all duration-200"
            >
              حساب تجاري
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuthLinks;
