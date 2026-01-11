'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Webcam from 'react-webcam';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle, CheckCircle2, Camera, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface VerificationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  lang?: string;
  dict?: {
    Verification?: {
      status_verified?: string;
      status_pending?: string;
      status_rejected?: string;
      status_unverified?: string;
      start_btn?: string;
      try_again_btn?: string;
      pending_tooltip?: string;
      apply_locked?: string;
      wizard?: {
        title?: string;
        step_id_title?: string;
        step_selfie_title?: string;
        instruction_intro?: string;
        instruction_date?: string;
        btn_take_photo?: string;
        btn_take_selfie?: string;
        btn_retake?: string;
        btn_confirm?: string;
        btn_submit?: string;
        btn_ready?: string;
        btn_close?: string;
        btn_go_back?: string;
        success_msg?: string;
      };
    };
  };
}

type Step = 1 | 2 | 3 | 4;

const dataURLtoBlob = (dataURL: string) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export default function VerificationWizard({
  open,
  onOpenChange,
  userId,
  lang = 'en',
  dict,
}: VerificationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIdCardConfirmed, setIsIdCardConfirmed] = useState(false);
  const [isSelfieConfirmed, setIsSelfieConfirmed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const idCardWebcamRef = useRef<Webcam>(null);
  const selfieWebcamRef = useRef<Webcam>(null);

  const todayDate = format(new Date(), 'dd.MM.yyyy');

  // Get today's date formatted for display
  const getTodayDateText = () => {
    const dateLabel = dict?.Verification?.wizard?.instruction_date || 'Today is:';
    return `${dateLabel} ${todayDate}`;
  };

  // Camera constraints - prefer back camera for ID, front camera for selfie
  const idCardVideoConstraints = {
    facingMode: { ideal: 'environment' as const }, // Back camera
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const selfieVideoConstraints = {
    facingMode: { ideal: 'user' as const }, // Front camera
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const captureIdCard = useCallback(() => {
    const imageSrc = idCardWebcamRef.current?.getScreenshot();
    if (imageSrc) {
      setIdCardImage(imageSrc);
      setIsIdCardConfirmed(false);
    }
  }, []);

  const captureSelfie = useCallback(() => {
    const imageSrc = selfieWebcamRef.current?.getScreenshot();
    if (imageSrc) {
      setSelfieImage(imageSrc);
      setIsSelfieConfirmed(false);
    }
  }, []);

  const handleIdCardConfirm = () => {
    setIsIdCardConfirmed(true);
    setStep(3);
  };

  const handleSelfieConfirm = () => {
    setIsSelfieConfirmed(true);
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!idCardImage || !selfieImage) {
      setError('Please capture both images');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Convert base64 to blob
      const idCardBlob = dataURLtoBlob(idCardImage);
      const selfieBlob = dataURLtoBlob(selfieImage);

      // Upload ID card
      const idCardPath = `${userId}/id_card.jpg`;
      const { error: idCardError } = await supabase.storage
        .from('verifications')
        .upload(idCardPath, idCardBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (idCardError) {
        throw new Error(`Failed to upload ID card: ${idCardError.message}`);
      }

      // Upload selfie
      const selfiePath = `${userId}/selfie.jpg`;
      const { error: selfieError } = await supabase.storage
        .from('verifications')
        .upload(selfiePath, selfieBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (selfieError) {
        throw new Error(`Failed to upload selfie: ${selfieError.message}`);
      }

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'pending'
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update verification status: ${updateError.message}`);
      }

      // Success - stay on step 4 to show success message
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission');
      setLoading(false);
    }
  };

  // Auto-submit when reaching step 4 with both images confirmed
  useEffect(() => {
    if (step === 4 && isIdCardConfirmed && isSelfieConfirmed && idCardImage && selfieImage && !loading && !error && !hasSubmitted) {
      setHasSubmitted(true);
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isIdCardConfirmed, isSelfieConfirmed]);

  const handleClose = () => {
    if (!loading) {
      // Reset state
      setStep(1);
      setIdCardImage(null);
      setSelfieImage(null);
      setIsIdCardConfirmed(false);
      setIsSelfieConfirmed(false);
      setHasSubmitted(false);
      setError(null);
      onOpenChange(false);
    }
  };

  const handleRetakeIdCard = () => {
    setIdCardImage(null);
    setIsIdCardConfirmed(false);
  };

  const handleRetakeSelfie = () => {
    setSelfieImage(null);
    setIsSelfieConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dict?.Verification?.wizard?.title || 'Identity Verification'}</DialogTitle>
          <DialogDescription>
            {dict?.Verification?.wizard?.instruction_intro?.split('.')[0] || 'Follow the steps to verify your identity'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step === stepNumber
                    ? 'bg-primary text-primary-foreground'
                    : step > stepNumber
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > stepNumber ? <CheckCircle2 className="h-5 w-5" /> : stepNumber}
              </div>
              {stepNumber < 4 && (
                <div
                  className={`w-12 h-1 mx-1 ${
                    step > stepNumber ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Introduction */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{dict?.Verification?.wizard?.instruction_intro?.split('.')[0] || 'Prepare for Verification'}</CardTitle>
              <CardDescription>{dict?.Verification?.wizard?.instruction_intro?.split('.')[1]?.trim() || 'Please prepare the following items before proceeding'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                    {dict?.Verification?.wizard?.instruction_intro || "Prepare your ID Card and a piece of paper with today's date written on it."}
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {getTodayDateText()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Make sure you have your ID card ready</li>
                  <li>Write today's date ({todayDate}) on a piece of paper</li>
                  <li>Ensure good lighting and a clear background</li>
                  <li>Have your device camera ready</li>
                </ol>
              </div>

              <Button onClick={() => setStep(2)} className="w-full">
                {dict?.Verification?.wizard?.btn_ready || 'I am ready'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: ID Card Capture */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{dict?.Verification?.wizard?.step_id_title || 'Capture ID Card'}</CardTitle>
              <CardDescription>
                {dict?.Verification?.wizard?.instruction_intro?.split('.')[1]?.trim() || 'Position your ID card within the frame below'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!idCardImage ? (
                <>
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <Webcam
                      audio={false}
                      ref={idCardWebcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={idCardVideoConstraints}
                      className="w-full h-full object-cover"
                    />
                    {/* Rectangular overlay for ID card guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 h-2/3 border-4 border-white rounded-lg shadow-2xl" />
                    </div>
                  </div>
                  <Button onClick={captureIdCard} className="w-full" size="lg">
                    <Camera className="mr-2 h-4 w-4" />
                    {dict?.Verification?.wizard?.btn_take_photo || 'Take Photo of ID'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={idCardImage}
                      alt="ID Card preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRetakeIdCard}
                      variant="outline"
                      className="flex-1"
                      disabled={loading}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {dict?.Verification?.wizard?.btn_retake || 'Retake'}
                    </Button>
                    <Button onClick={handleIdCardConfirm} className="flex-1" disabled={loading}>
                      {dict?.Verification?.wizard?.btn_confirm || 'Confirm'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Selfie with Date */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>{dict?.Verification?.wizard?.step_selfie_title || 'Capture Selfie with Date'}</CardTitle>
              <CardDescription>
                {dict?.Verification?.wizard?.instruction_intro?.split('.')[2]?.trim() || 'Hold the paper with the date next to your face'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selfieImage ? (
                <>
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <Webcam
                      audio={false}
                      ref={selfieWebcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={selfieVideoConstraints}
                      mirrored
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay with oval for face and rectangle for date paper */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Oval for face (centered) */}
                        <div className="absolute border-4 border-white rounded-full w-48 h-64 shadow-2xl" />
                        {/* Rectangle for date paper (positioned beside/below the face) */}
                        <div className="absolute top-1/2 left-1/2 translate-x-16 translate-y-8 border-4 border-white rounded-lg w-32 h-24 shadow-2xl" />
                      </div>
                    </div>
                  </div>
                  <Button onClick={captureSelfie} className="w-full" size="lg">
                    <Camera className="mr-2 h-4 w-4" />
                    {dict?.Verification?.wizard?.btn_take_selfie || 'Take Selfie'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={selfieImage}
                      alt="Selfie preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRetakeSelfie}
                      variant="outline"
                      className="flex-1"
                      disabled={loading}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {dict?.Verification?.wizard?.btn_retake || 'Retake'}
                    </Button>
                    <Button onClick={handleSelfieConfirm} className="flex-1" disabled={loading}>
                      {dict?.Verification?.wizard?.btn_confirm || 'Confirm'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Submission/Success */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {loading 
                  ? 'Submitting Verification'
                  : error 
                  ? 'Submission Error'
                  : (dict?.Verification?.wizard?.success_msg || 'Verification Sent for Review')}
              </CardTitle>
              <CardDescription>
                {loading
                  ? 'Please wait while we process your verification...'
                  : error
                  ? 'There was an error submitting your verification'
                  : (dict?.Verification?.wizard?.success_msg || 'Your verification has been submitted successfully')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Uploading images and updating status...</p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => setStep(3)}
                      variant="outline"
                      size="sm"
                    >
                      {dict?.Verification?.wizard?.btn_go_back || 'Go Back'}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      size="sm"
                    >
                      {dict?.Verification?.try_again_btn || 'Try Again'}
                    </Button>
                  </div>
                </div>
              )}
              {!loading && !error && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <p className="text-center text-muted-foreground">
                    {dict?.Verification?.wizard?.success_msg || 'Your verification documents have been submitted successfully. Our team will review them and update your verification status soon.'}
                  </p>
                  <Button onClick={handleClose} className="w-full">
                    {dict?.Verification?.wizard?.btn_close || 'Close'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
