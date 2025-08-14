import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Reset() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    const token = localStorage.getItem('resetToken');
    if (!token) {
      setError('رمز غير موجود');
      setLoading(false);
      return;
    }
    try {
      // الطريقة الصحيحة مع supabase-js v2:
      await supabase.auth.setSession({ access_token: token, refresh_token: token });
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError('❌ فشل: ' + error.message);
      } else {
        setSuccess('✅ تم التغيير بنجاح');
        localStorage.removeItem('resetToken');
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (e) {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: '#222', borderRadius: 8, color: '#fff' }}>
      <h2 style={{ textAlign: 'center', color: '#ff9800' }}>إعادة تعيين كلمة المرور</h2>
      <input
        type="password"
        placeholder="كلمة المرور الجديدة"
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 4, border: '1px solid #444', color: '#000', background: '#fff' }}
        disabled={loading}
      />
      <button onClick={handleReset} style={{ width: '100%', padding: 10, background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold' }} disabled={loading}>
        {loading ? 'جاري التغيير...' : 'تأكيد'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 12, textAlign: 'center' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 12, textAlign: 'center' }}>{success}</div>}
    </div>
  );
}
