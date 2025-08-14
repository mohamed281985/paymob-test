import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Owner: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const downloadPDF = () => {
    const pdfUrl = language === 'ar' 
      ? '/pdf/owner-guide-ar.pdf'
      : '/pdf/owner-guide-en.pdf';
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = language === 'ar' 
      ? 'دليل المالك.pdf'
      : 'Owner Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t('success'),
      description: t('pdf_download_started'),
      className: "z-[10001]"
    });
  };

  return (
    <div className="min-h-screen bg-imei-dark p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            {t('owner_dashboard')}
          </h1>
          <Button
            onClick={downloadPDF}
            variant="outline"
            className="text-white border-imei-cyan hover:bg-imei-cyan"
          >
            <Download className="mr-2 h-4 w-4" />
            {t('download_guide')}
          </Button>
        </div>

        {/* ... rest of the component ... */}
      </div>
    </div>
  );
};

export default Owner; 