import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';
import ImageUploader from '@/components/ImageUploader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BusinessProfileComplete() {
  const { t } = useLanguage();
  const [storeImage, setStoreImage] = useState<File | null>(null);
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const [previews, setPreviews] = useState<{ storeImage: string | null; licenseImage: string | null }>({ storeImage: null, licenseImage: null });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { completeProfile } = useAuth();

  const handleImage = useCallback(async (file: File, type: 'store' | 'license') => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit for original file
      toast({ title: t('error'), description: t('file_too_large_10mb'), variant: 'destructive' });
      return;
    }

    const setFile = type === 'store' ? setStoreImage : setLicenseImage;
    const setPreview = (url: string | null) => setPreviews(p => ({ ...p, [type === 'store' ? 'storeImage' : 'licenseImage']: url }));

    if (type === 'store' && previews.storeImage) URL.revokeObjectURL(previews.storeImage);
    if (type === 'license' && previews.licenseImage) URL.revokeObjectURL(previews.licenseImage);
    setPreview(URL.createObjectURL(file));

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
    };

    try {
      toast({ description: t('compressing_image') });
      const compressedFile = await imageCompression(file, options);
      setFile(compressedFile);
      toast({ title: t('success'), description: t('image_compressed_successfully') });
    } catch (error) {
      console.error('Image compression error:', error);
      toast({ title: t('error'), description: t('image_compression_failed'), variant: 'destructive' });
      setFile(file); // Fallback to original file
    }
  }, [previews.storeImage, previews.licenseImage, t, toast]);

  const uploadBusinessAsset = async (userId: string, file: File, assetName: string): Promise<string> => {
    const filePath = `${userId}/${assetName}_${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw new Error(`Failed to upload ${assetName}: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from('business-assets').getPublicUrl(filePath);
    if (!publicUrl) throw new Error(`Could not get URL for ${assetName}`);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for all required data
    if (!storeImage || !licenseImage) {
      toast({
        title: 'Missing Data',
        description: 'Please upload the store image and business license.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !user) throw new Error('You must be logged in first.');
      const userId = user.id;
      const [storeImageUrl, licenseImageUrl] = await Promise.all([
        uploadBusinessAsset(userId, storeImage, 'store_image'),
        uploadBusinessAsset(userId, licenseImage, 'license_image'),
      ]);
      const { error: profileUpdateError } = await supabase
        .from('businesses')
        .update({ store_image_url: storeImageUrl, license_image_url: licenseImageUrl })
        .eq('user_id', userId);
      if (profileUpdateError) throw new Error(`Failed to save data: ${profileUpdateError.message}`);
      
      // Update profile completion status in context before navigating
      completeProfile();
      
      toast({
        title: 'Profile Completed Successfully',
        description: 'Your business data has been saved. You will be redirected now...',
      });

      // Wait for two seconds before redirecting to give the user a chance to read the message
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to capture an image with the camera and update the state
  const handleCameraCapture = async (type: 'store' | 'license') => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
  
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], `${type}_${Date.now()}.webp`, { type: 'image/webp' });
        await handleImage(file, type);
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      toast({ title: 'Error', description: 'Failed to capture image.', variant: 'destructive' });
    }
  };

  return (
    <div>
      <div>
        <form onSubmit={handleSubmit}>
          <ImageUploader
            label="Store Image"
            image={previews.storeImage || ''}
            setImage={(url) => {
              if (!url) {
                if (previews.storeImage) URL.revokeObjectURL(previews.storeImage);
                setPreviews(p => ({ ...p, storeImage: null }));
                setStoreImage(null);
              }
            }}
            onCameraClick={() => handleCameraCapture('store')}
          />
          
          <ImageUploader
            label="Business License Image"
            image={previews.licenseImage || ''}
            setImage={(url) => {
              if (!url) {
                if (previews.licenseImage) URL.revokeObjectURL(previews.licenseImage);
                setPreviews(p => ({ ...p, licenseImage: null }));
                setLicenseImage(null);
              }
            }}
            onCameraClick={() => handleCameraCapture('license')}
          />
          <Button type="submit" disabled={loading} className="w-full text-white text-lg font-large py-90 bg-orange-500 hover:bg-orange-600">
            {loading ? 'Saving...' : 'Confirm and Save'}
          </Button>
        </form>
      </div>
    </div>
  );
}
