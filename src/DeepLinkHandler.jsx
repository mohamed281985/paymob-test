import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    CapacitorApp.addListener('appUrlOpen', (event) => {
      const url = new URL(event.url);
      const hash = url.hash.replace('#', '');
      const params = new URLSearchParams(hash);

      const type = params.get('type'); // ← النوع (signup أو recovery)
      const token = params.get('access_token');

      if (type === 'signup') {
        // ✅ تأكيد الإيميل: وجه المستخدم إلى صفحة استكمال البيانات التجارية
        navigate('/business-profile-complete');
      } else if (type === 'recovery' && token) {
        // ✅ إعادة تعيين كلمة المرور
        localStorage.setItem('resetToken', token);
        navigate('/reset');
      } else {
        // أي حالة أخرى
        navigate('/');
      }
    });
  }, []);

  return null;
}
