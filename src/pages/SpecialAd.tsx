import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { useLanguage } from '../contexts/LanguageContext';
import { useGeolocated } from 'react-geolocated';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// UI Components
import PageContainer from '../components/PageContainer';
import AppNavbar from '../components/AppNavbar';
import BackButton from '../components/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Icons
import { Upload, Store, Link as LinkIcon, CalendarDays, Send, MapPin } from 'lucide-react';

const SpecialAd: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [adImage, setAdImage] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [duration, setDuration] = useState('7'); // Default duration
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // زيادة الحد الأقصى للملف الأصلي إلى 10 ميجا
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('error'), description: t('file_too_large_10mb'), variant: 'destructive' });
        return;
      }

      // عرض الصورة الأصلية للمعاينة فوراً
      setAdImagePreview(URL.createObjectURL(file));

      // إعدادات ضغط الصورة
      const options = {
        maxSizeMB: 1,          // الحجم الأقصى بعد الضغط: 1 ميجا
        maxWidthOrHeight: 1920, // الأبعاد القصوى
        useWebWorker: true,    // استخدام Web Worker لتحسين الأداء
        fileType: 'image/webp', // تحويل الصورة إلى صيغة webp
      };

      try {
        toast({ description: t('compressing_image') }); // إعلام المستخدم
        const compressedFile = await imageCompression(file, options);
        setAdImage(compressedFile);
        toast({ title: t('success'), description: t('image_compressed_successfully') });
      } catch (error) {
        console.error('Image compression error:', error);
        toast({ title: t('error'), description: t('image_compression_failed'), variant: 'destructive' });
        setAdImage(file); // استخدام الملف الأصلي في حال فشل الضغط
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adImage || !storeName) {
      toast({ title: t('error'), description: t('required_fields'), variant: 'destructive' });
      return;
    }
    if (!user) {
        toast({ title: t('error'), description: t('must_be_logged_in'), variant: 'destructive' });
        return;
    }
    if (!coords) {
      toast({ title: t('error'), description: t('location_not_available'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload image to Supabase Storage
      const filePath = `special_ads/${user.id}/${Date.now()}_${adImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('advertisements')
        .upload(filePath, adImage);

      if (uploadError || !uploadData) {
        throw new Error('فشل رفع الصورة إلى التخزين.');
      }

      // 2. Get public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('advertisements')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('لم يتم العثور على رابط الصورة بعد الرفع.');
      }

      // 3. Calculate expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(duration, 10));

      // 4. Insert ad data into the 'special_ad' table
      const { error: insertError } = await supabase
        .from('special_ad')
        .insert({
          user_id: user.id ?? null,
          store_name: storeName || null,
          image_url: publicUrlData.publicUrl || null,
          website_url: websiteUrl || null,
          duration_days: duration ? parseInt(duration, 10) : null,
          expires_at: expirationDate ? expirationDate.toISOString() : null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          upload_date: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      toast({ title: t('success'), description: t('ad_published_successfully') });
      navigate('/dashboard');

    } catch (error: any) {
      console.error('Error publishing ad:', error);
      toast({ title: t('error'), description: error.message || t('error_publishing_ad'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <AppNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold text-center flex-1 pr-10">{t('publish_special_ad')}</h1>
        </div>

        <Card className="max-w-2xl mx-auto bg-imei-darker border-imei-cyan/20">
          <CardHeader>
            <CardTitle className="text-imei-cyan">{t('ad_details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div>
                <Label className="text-white">{t('ad_image')}</Label>
                <div
                  className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-1 text-center">
                    {adImagePreview ? (
                      <img src={adImagePreview} alt="Ad preview" className="mx-auto h-48 w-auto rounded-md" />
                    ) : (
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    )}
                    <div className="flex text-sm text-gray-400">
                      <p className="pl-1">{t('upload_an_image')}</p>
                    </div>
                    <p className="text-xs text-gray-500">{t('png_jpg_up_to_10mb')}</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleImageChange}
                />

                {/* معاينة الإعلان المميز */}
                {adImagePreview && (
                  <div className="mt-6">
                    <Label className="text-white mb-4 block">{t('special_ad_preview')}</Label>
                    <div className="rounded-xl overflow-hidden shadow-lg">
                      {/* صورة الإعلان المميز */}
                      <div className="relative h-[300px]">
                        <img 
                          src={adImagePreview} 
                          alt="Special Ad Preview" 
                          className="w-full h-full object-cover"
                        />
                        {/* طبقة التدرج الشفافة */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80">
                          {/* شارة الإعلان المميز */}
                          <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {t('special_ad')}
                          </div>
                        </div>
                        {/* معلومات المتجر */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-imei-dark/80 flex items-center justify-center">
                              <Store className="h-5 w-5 text-imei-cyan" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">
                                {storeName || t('your_store_name')}
                              </h3>
                              {websiteUrl && (
                                <div className="flex items-center gap-2 text-gray-200 text-sm">
                                  <LinkIcon className="h-4 w-4" />
                                  <span>WhatsApp</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* معلومات الموقع */}
                          {coords && (
                            <div className="flex items-center gap-2 text-gray-200 text-sm mt-2">
                              <MapPin className="h-4 w-4 text-imei-cyan" />
                              <span>{t('location_based_ad')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* معلومات إضافية */}
                      <div className="bg-imei-darker p-4 border-t border-imei-cyan/20">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-imei-cyan text-sm">
                            <CalendarDays className="h-4 w-4" />
                            <span>{duration} {t('days')}</span>
                          </div>
                          <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs">
                            {t('active')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Store Name */}
              <div>
                <Label htmlFor="storeName" className="text-white">{t('store_name')}</Label>
                <div className="relative mt-2">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={t('enter_store_name')}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Ad Duration */}
              <div>
                <Label className="text-white">{t('ad_duration')}</Label>
                <RadioGroup
                  defaultValue="7"
                  className="mt-2 grid grid-cols-3 gap-4"
                  value={duration}
                  onValueChange={setDuration}
                >
                  <Label htmlFor="d3" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                    <RadioGroupItem value="3" id="d3" className="sr-only" />
                    <CalendarDays className="mb-3 h-6 w-6" />
                    3 {t('days')}
                  </Label>
                  <Label htmlFor="d7" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                    <RadioGroupItem value="7" id="d7" className="sr-only" />
                    <CalendarDays className="mb-3 h-6 w-6" />
                    7 {t('days')}
                  </Label>
                  <Label htmlFor="d15" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                    <RadioGroupItem value="15" id="d15" className="sr-only" />
                    <CalendarDays className="mb-3 h-6 w-6" />
                    15 {t('days')}
                  </Label>
                </RadioGroup>
              </div>

              {/* Location Info */}
              <div className="p-3 bg-gray-800 rounded-md border border-gray-700">
                <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="h-5 w-5 text-imei-cyan" />
                    <span className="font-medium">{t('ad_location')}</span>
                </div>
                {!isGeolocationAvailable ? (
                    <p className="text-sm text-red-400 mt-2">{t('geolocation_not_supported')}</p>
                ) : !isGeolocationEnabled ? (
                    <p className="text-sm text-yellow-400 mt-2">{t('geolocation_not_enabled')}</p>
                ) : coords ? (
                    <p className="text-sm text-green-400 mt-2">{t('location_captured_successfully')}</p>
                ) : (
                    <p className="text-sm text-gray-400 mt-2">{t('getting_location')}</p>
                )}
              </div>

              {/* WhatsApp Link */}
              <div>
                <Label htmlFor="websiteUrl" className="text-white">{t('whatsapp_link')} ({t('optional')})</Label>
                <div className="relative mt-2">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://wa.me/..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full glowing-button" disabled={isLoading}>
                {isLoading ? t('publishing') : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('publish_special_ad')}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default SpecialAd;