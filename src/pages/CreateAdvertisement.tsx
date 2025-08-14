import React from 'react';
import PageContainer from '../components/PageContainer';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Info, Share2, MapPin, Globe, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateAdvertisement: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-center">{t('create_advertisement')}</h1>
          <Button onClick={() => navigate('/myads')} variant="outline" className="flex items-center gap-2 border-imei-cyan text-imei-cyan hover:bg-imei-cyan/10">
            <List className="w-4 h-4" />
            {t('my_ads')}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Location-Based Ad Box */}
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
            <div className="flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold mb-4 text-center text-white">{t('website_commercial_ad')}</h2>
            <p className="text-gray-300 mb-8 text-center">{t('website_ad_description')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button variant="outline" className="flex items-center border-purple-500 text-white hover:bg-purple-500 hover:text-white transition-colors duration-300 w-full sm:w-auto justify-center">
                <Info className="mr-2 h-4 w-4" />
                {t('details')}
              </Button>
              <Button
                onClick={() => navigate('/publish-ad')}
                className="flex items-center bg-purple-500 text-white hover:bg-purple-600 transition-colors duration-300 w-full sm:w-auto justify-center"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t('create_advertisement')}
              </Button>
            </div>
          </div>

          {/* General Commercial Ad Box */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-lg p-6 backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold mb-4 text-center text-white">{t('general_commercial_ad')}</h2>
            <p className="text-gray-300 mb-8 text-center">{t('general_ad_description')}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button variant="outline" className="flex items-center border-emerald-500 text-white hover:bg-emerald-500 hover:text-white transition-colors duration-300 w-full sm:w-auto justify-center">
                <Info className="mr-2 h-4 w-4" />
                {t('details')}
              </Button>
              <Button
                onClick={() => navigate('/special-ad')}
                className="flex items-center bg-emerald-500 text-white hover:bg-emerald-600 transition-colors duration-300 w-full sm:w-auto justify-center"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t('publish_ad')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default CreateAdvertisement;