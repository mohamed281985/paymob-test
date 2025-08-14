import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useGeolocated } from 'react-geolocated';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
import { Upload, Store, Link as LinkIcon, CalendarDays, Send, MapPin, X } from 'lucide-react';

const PublishAd: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const [adId, setAdId] = useState<string | null>(null);
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [duration, setDuration] = useState('7'); // Default duration
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 56.25, // 9/16 of 100 for 16:9 ratio
    x: 0,
    y: 21.875 // Centered vertically: (100 - 56.25) / 2
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  // Effect to check for an ad ID in the URL for editing
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setAdId(id);
      const fetchAdData = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          toast({ title: t('error'), description: t('error_fetching_ad_details'), variant: 'destructive' });
          navigate('/myads'); // Redirect if ad not found
          return;
        }

        // Populate form with existing ad data
        setStoreName(data.store_name || '');
        setWebsiteUrl(data.website_url || '');
        setDuration(String(data.duration_days || '7'));
        setAdImagePreview(data.image_url);
        setIsLoading(false);
      };
      fetchAdData();
    }
  }, [searchParams, navigate, t, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: t('error'), description: t('file_too_large'), variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setAdImagePreview(reader.result as string);
        setIsEditing(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: Crop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // The crop dimensions are in display pixels, we need to scale them
    // to the natural image size to preserve quality.
    const sourceX = crop.x * scaleX;
    const sourceY = crop.y * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

    // To avoid overly large images, we can cap the output resolution.
    // 1920px is a good balance between quality and file size for web.
    const MAX_WIDTH_OR_HEIGHT = 1920;
    let outputWidth = sourceWidth;
    let outputHeight = sourceHeight;

    if (outputWidth > MAX_WIDTH_OR_HEIGHT || outputHeight > MAX_WIDTH_OR_HEIGHT) {
      const ratio = outputWidth / outputHeight;
      if (ratio > 1) { // Landscape
        outputWidth = MAX_WIDTH_OR_HEIGHT;
        outputHeight = MAX_WIDTH_OR_HEIGHT / ratio;
      } else { // Portrait or square
        outputHeight = MAX_WIDTH_OR_HEIGHT;
        outputWidth = MAX_WIDTH_OR_HEIGHT * ratio;
      }
    }

    canvas.width = Math.round(outputWidth);
    canvas.height = Math.round(outputHeight);

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/webp',
        0.9
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      setAdImage(new File([croppedBlob], 'cropped.webp', { type: 'image/webp' }));
      setAdImagePreview(URL.createObjectURL(croppedBlob));
      setIsEditing(false);
    } catch (e) {
      console.error('Error cropping image:', e);
      toast({ 
        title: t('error'),
        description: t('error_cropping_image') || 'حدث خطأ أثناء قص الصورة',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName) {
      toast({ title: t('error'), description: t('required_fields'), variant: 'destructive' });
      return;
    }
    if (!adImage && !adId) { // Image is only required for new ads
      toast({ title: t('error'), description: t('ad_image_required'), variant: 'destructive' });
      return;
    }
    if (!user) {
        toast({ title: t('error'), description: t('must_be_logged_in'), variant: 'destructive' });
        return;
    }
    if (!coords && !adId) { // Location is only required for new
      toast({ title: t('error'), description: t('location_not_available'), variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload image to Supabase Storage
      const filePath = `ads/${user.id}/${Date.now()}_${adImage.name}`;
      const { error: uploadError } = await supabase.storage
        .from('advertisements') // Assuming a bucket named 'advertisements'
        .upload(filePath, adImage);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('advertisements')
        .getPublicUrl(filePath);

      // 3. Calculate expiration date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(duration, 10));

      // 4. Insert ad data into the 'advertisements' table
      const { error: insertError } = await supabase
        .from('advertisements')
        .insert({
          user_id: user.id ?? null,
          store_name: storeName || null,
          image_url: publicUrl || null,
          website_url: websiteUrl || null,
          duration_days: duration ? parseInt(duration, 10) : null,
          expires_at: expirationDate ? expirationDate.toISOString() : null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          upload_date: new Date().toISOString(),
          page: '',
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
          <h1 className="text-2xl font-bold text-center flex-1 pr-10">{t('publish_ad')}</h1>
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
                    <p className="text-xs text-gray-500">{t('png_jpg_up_to_5mb')}</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleImageChange}
                />

                {/* معاينة الإعلان */}
                {isEditing && adImagePreview ? (
                  <div className="mt-6">
                    <Label className="text-white mb-4 block">{t('crop_image') || 'قص الصورة'}</Label>
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      keepSelection={true}
                      circularCrop={false}
                      minHeight={100}
                      aspect={16/9}
                      className="max-w-full bg-gray-900 rounded-lg overflow-hidden"
                    >
                      <img
                        ref={imgRef}
                        src={adImagePreview}
                        alt="Preview"
                        className="max-w-full"
                      />
                    </ReactCrop>
                    <Button
                      onClick={handleCropComplete}
                      className="mt-4 bg-imei-cyan text-white hover:bg-imei-cyan/80"
                    >
                      {t('complete_crop') || 'تأكيد قص الصورة'}
                    </Button>
                  </div>
                ) : adImagePreview ? (
                  <div className="mt-6">
                    <Label className="text-white mb-4 block">{t('ad_preview')}</Label>
                    
                    {/* معاينة الإعلان المميز */}
                    <div className="mb-6">
                      <h3 className="text-imei-cyan text-sm mb-2">{t('featured_ad_preview')}</h3>
                      <div className="relative rounded-xl overflow-hidden border-2 border-imei-cyan/20 hover:border-imei-cyan/40 transition-all">
                        <img 
                          src={adImagePreview} 
                          alt="Featured Preview" 
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-imei-cyan" />
                            <span className="text-white text-sm font-medium">{storeName || t('your_store_name')}</span>
                          </div>
                          {websiteUrl && (
                            <div className="flex items-center gap-2 mt-1">
                              <LinkIcon className="h-4 w-4 text-imei-cyan" />
                              <span className="text-gray-300 text-xs">WhatsApp</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAdImage(null);
                            setAdImagePreview(null);
                            setIsEditing(false);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* معاينة الإعلان العام */}
                    <div>
                      <h3 className="text-imei-cyan text-sm mb-2">{t('regular_ad_preview')}</h3>
                      <div className="relative rounded-xl overflow-hidden border-2 border-imei-cyan/20 hover:border-imei-cyan/40 transition-all">
                        <img 
                          src={adImagePreview} 
                          alt="Regular Preview" 
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-imei-cyan" />
                            <span className="text-white text-sm font-medium">{storeName || t('your_store_name')}</span>
                          </div>
                          {websiteUrl && (
                            <div className="flex items-center gap-2 mt-1">
                              <LinkIcon className="h-4 w-4 text-imei-cyan" />
                              <span className="text-gray-300 text-xs">WhatsApp</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
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
                    {t('publish_ad')}
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

export default PublishAd;