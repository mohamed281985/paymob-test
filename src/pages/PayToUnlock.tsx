
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { mockPhoneReports } from "../services/mockData";
import PageContainer from "../components/PageContainer";
import AppNavbar from "../components/AppNavbar";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PayToUnlock: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();

  const handleSubmit = () => {
    // Show thank you message
    toast({
      title: t('thank_you'),
      description: t('owner_will_be_notified'),
    });
    
    // Navigate to home after a short delay
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  return (
    <PageContainer>
      <AppNavbar />
      <div className="my-8 max-w-[420px] mx-auto px-2">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-imei-cyan hover:underline"
        >
          <ArrowLeft size={16} className="mr-1" />
          {t('go_back')}
        </button>

        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-4">
            {t('found_your_phone')}
          </h2>
          
          <button 
            onClick={handleSubmit}
            className="glowing-button w-full"
          >
            {t('reach_your_phone')}
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

export default PayToUnlock;
