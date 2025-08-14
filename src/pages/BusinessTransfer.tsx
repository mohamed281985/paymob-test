import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const BusinessTransfer: React.FC = () => {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchStoreName = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('businesses')
          .select('store_name')
          .eq('user_id', user.id)
          .single();
        if (data) setStoreName(data.store_name);
        if (error) console.error('Error fetching store name:', error);
      }
    };
    fetchStoreName();
  }, [user]);

  const handleBuyClick = () => {
    navigate('/BusinessTransferbuy');
  };

  const handleSellClick = () => {
    navigate('/BusinessTransfersell');
  };

  const handlePhoneLogClick = () => {
    navigate('/transfer-history');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-imei-dark px-4 py-8">
      <Logo size="lg" className="mb-6" />
      <h1 className="text-2xl md:text-3xl font-bold text-imei-cyan mb-8">مرحباً بك في متجر {storeName}</h1>
      <div className="space-y-4 w-full max-w-md">
        <button
          onClick={handleBuyClick}
          className="w-full bg-imei-cyan hover:bg-imei-cyan/90 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-imei-cyan/20"
        >
          شراء
        </button>
        <button
          onClick={handleSellClick}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
        >
          بيع
        </button>
        <button
          onClick={handlePhoneLogClick}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          سجل الهاتف
        </button>
      </div>
    </div>
  );
};

export default BusinessTransfer;