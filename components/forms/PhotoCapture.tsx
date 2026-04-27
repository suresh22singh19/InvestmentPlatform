"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { FileUploadField } from "@/components/ui";
import { PatientTypeButtonGroup } from "@/components/ui/PatientTypeButtonGroup";
import { Dialog } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

export interface PhotoCaptureFormData {
  vehiclePhoto: File | null;
  aadharPhoto: File | null;
}

type PhotoCaptureMode = "vehicle" | "aadhar" | "both";

interface PhotoCaptureProps {
  formData: PhotoCaptureFormData;
  onChange: (field: keyof PhotoCaptureFormData, file: File | null) => void;
  mode?: PhotoCaptureMode;
  title?: string;
  /** When true, omit outer card border/title (use inside another section). */
  embedded?: boolean;
  /** Override per-slot labels (defaults: vehicle / Aadhar copy). */
  fieldLabels?: Partial<Record<keyof PhotoCaptureFormData, string>>;
  /** Label above Take a Photo / Upload Photo (default: "Photo Selection"). */
  selectionHeading?: string;
  /** When true, show a red * after {@link selectionHeading}. */
  selectionHeadingRequired?: boolean;
  /** `data-field` on each upload slot (for form scroll-to-error). */
  slotDataFields?: Partial<Record<keyof PhotoCaptureFormData, string>>;
  /** e.g. Formik/Yup messages for a slot (shown under upload; does not replace file-type errors). */
  externalFieldErrors?: Partial<Record<keyof PhotoCaptureFormData, string>>;
  accept?: string; // e.g. "image/png,image/jpeg"
  onValidationChange?: (hasErrors: boolean, errors: { vehiclePhoto?: string; aadharPhoto?: string }) => void;
}

export interface PhotoCaptureRef {
  scrollToError: () => void;
  hasErrors: () => boolean;
  getErrorField: () => keyof PhotoCaptureFormData | null;
}

const DEFAULT_VEHICLE_LABEL = "Take Photo Vehicle Number";
const DEFAULT_AADHAR_LABEL = "Take Photo Aadhar Card";

const PhotoCapture = forwardRef<PhotoCaptureRef, PhotoCaptureProps>(({
  formData,
  onChange,
  mode = "both",
  title = "Photo Capture",
  embedded = false,
  fieldLabels,
  selectionHeading = "Photo Selection",
  selectionHeadingRequired = false,
  slotDataFields,
  externalFieldErrors,
  // PNG, JPEG/JPG, SVG only (same rules as gate new-patient photo flow)
  accept = "image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg",
  onValidationChange,
}, ref) => {
  const labelVehicle = fieldLabels?.vehiclePhoto ?? DEFAULT_VEHICLE_LABEL;
  const labelAadhar = fieldLabels?.aadharPhoto ?? DEFAULT_AADHAR_LABEL;
  const containerRef = useRef<HTMLDivElement>(null);
  const vehiclePhotoRef = useRef<HTMLDivElement>(null);
  const aadharPhotoRef = useRef<HTMLDivElement>(null);
  const showVehicle = mode === "vehicle" || mode === "both";
  const showAadhar = mode === "aadhar" || mode === "both";
  const showBoth = mode === "both";

  // Single toggle that controls behavior for all photo fields
  // Default is "Upload Photo"
  const [photoOption, setPhotoOption] = useState<string>("upload photo");
  
  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeField, setActiveField] = useState<keyof PhotoCaptureFormData | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // File validation errors
  const [fileErrors, setFileErrors] = useState<{
    vehiclePhoto?: string;
    aadharPhoto?: string;
  }>({});

  const vehicleErrorText = fileErrors.vehiclePhoto || externalFieldErrors?.vehiclePhoto;
  const aadharErrorText = fileErrors.aadharPhoto || externalFieldErrors?.aadharPhoto;

  // Keys to force reset of FileUploadField when file is rejected
  const [fileFieldKeys, setFileFieldKeys] = useState<{
    vehiclePhoto: number;
    aadharPhoto: number;
  }>({
    vehiclePhoto: 0,
    aadharPhoto: 0,
  });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToError: () => {
      // Find the first field with an error and scroll to it
      if (fileErrors.vehiclePhoto && showVehicle && vehiclePhotoRef.current) {
        setTimeout(() => {
          vehiclePhotoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else if (fileErrors.aadharPhoto && showAadhar && aadharPhotoRef.current) {
        setTimeout(() => {
          aadharPhotoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else if (containerRef.current) {
        // Fallback to scrolling to the container
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    },
    hasErrors: () => {
      return !!(fileErrors.vehiclePhoto || fileErrors.aadharPhoto);
    },
    getErrorField: () => {
      if (fileErrors.vehiclePhoto) return "vehiclePhoto";
      if (fileErrors.aadharPhoto) return "aadharPhoto";
      return null;
    },
  }));

  // Store onValidationChange in a ref to avoid dependency issues
  const onValidationChangeRef = useRef(onValidationChange);
  
  // Update ref when callback changes
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  // Notify parent when validation errors change
  useEffect(() => {
    if (onValidationChangeRef.current) {
      const hasErrors = !!(fileErrors.vehiclePhoto || fileErrors.aadharPhoto);
      onValidationChangeRef.current(hasErrors, fileErrors);
    }
  }, [fileErrors]);

  // Auto-clear errors after 4 seconds (fields are optional)
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    if (fileErrors.vehiclePhoto) {
      const timeout = setTimeout(() => {
        setFileErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.vehiclePhoto;
          return newErrors;
        });
      }, 4000); // 4 seconds
      timeouts.push(timeout);
    }

    if (fileErrors.aadharPhoto) {
      const timeout = setTimeout(() => {
        setFileErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.aadharPhoto;
          return newErrors;
        });
      }, 4000); // 4 seconds
      timeouts.push(timeout);
    }

    // Cleanup timeouts on unmount or when errors change
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [fileErrors.vehiclePhoto, fileErrors.aadharPhoto]);

  // Open camera for a specific field
  const handleOpenCamera = (field: keyof PhotoCaptureFormData) => {
    if (photoOption.toLowerCase() === "take a photo") {
      setActiveField(field);
      setCameraOpen(true);
      setCameraError("");
    }
  };

  // Close camera and cleanup
  const handleCloseCamera = () => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setActiveField(null);
    setCameraError("");
    setIsPermissionDenied(false);
  };

  // Request camera permission again
  const handleRequestPermission = async () => {
    setCameraError("");
    setIsPermissionDenied(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraError("");
        setIsPermissionDenied(false);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      const isPermissionError = err.name === "NotAllowedError";
      setIsPermissionDenied(isPermissionError);
      setCameraError(
        isPermissionError
          ? "Camera access blocked. Click the camera/lock icon in your browser's address bar, set Camera to 'Allow', then reload the page."
          : "Failed to access camera. Please check your camera settings."
      );
    }
  };

  // Initialize camera when dialog opens
  useEffect(() => {
    if (cameraOpen && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } }) // Use back camera on mobile
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch((err) => {
              console.error("Error playing video:", err);
              setCameraError("Failed to start camera");
            });
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          const isPermissionError = err.name === "NotAllowedError";
          setIsPermissionDenied(isPermissionError);
          setCameraError(
            isPermissionError
              ? "Camera access blocked. Click the camera/lock icon in your browser's address bar, set Camera to 'Allow', then reload the page."
              : "Failed to access camera. Please check your camera settings."
          );
        });
    }

    // Cleanup on unmount or when camera closes
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen]);

  // Take photo from camera
  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !activeField) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob and create File
    canvas.toBlob(
      (blob) => {
        if (blob && activeField) {
          const fileName = `${activeField}_${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: "image/jpeg" });
          onChange(activeField, file);
          handleCloseCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // Validate file type and size (PNG, JPG/JPEG, SVG — same messaging pattern as gate/new-patient)
  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml"];
    const fileType = file.type.toLowerCase().trim();

    const fileName = file.name.toLowerCase();
    const dot = fileName.lastIndexOf(".");
    const fileExtension = dot >= 0 ? fileName.substring(dot) : "";

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".svg"];

    const isValidType =
      allowedTypes.includes(fileType) ||
      (fileExtension !== "" && allowedExtensions.includes(fileExtension));

    if (!isValidType) {
      return "Only image files (PNG, JPG, JPEG, SVG) are allowed";
    }
    
    // Check file size - max 3MB
    const maxSize = 3 * 1024 * 1024; // 3MB in bytes
    if (file.size > maxSize) {
      return "File size must be less than 3MB";
    }
    
    return null; // No error
  };

  // Handle file upload (when photoOption is "Upload Photo")
  const handleFileChange = (field: keyof PhotoCaptureFormData, file: File | null, fileName?: string) => {
    if (photoOption.toLowerCase() === "upload photo") {
      if (file) {
        // Validate file
        const error = validateFile(file);
        if (error) {
          // Set error for this field
          setFileErrors((prev) => ({
            ...prev,
            [field]: error,
          }));
          // Force reset of FileUploadField by changing its key
          setFileFieldKeys((prev) => ({
            ...prev,
            [field]: (prev[field as keyof typeof prev] || 0) + 1,
          }));
          // Clear the form data - don't accept the file
          onChange(field, null);
          return;
        } else {
          // Clear error if validation passes
          setFileErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      } else {
        // Clear error when file is removed
        setFileErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
      onChange(field, file);
    }
  };

  const shellClass = embedded
    ? "space-y-4"
    : "space-y-6 rounded-[16px] border border-[#E3EEE1] bg-white px-5 py-5 shadow-[0px_6px_40px_rgba(34,56,43,0.08)]";

  return (
    <>
      <div ref={containerRef} className={shellClass}>
        {!embedded ? <h2 className="text-base font-medium leading-[120%] text-[#262D3B]">{title}</h2> : null}

        <div className="w-full flex">
          <div className="lg:w-1/3 md:w-1/2 w-full space-y-1">
            <span className="block text-xs font-medium text-[#7B8089]">
              {selectionHeading}
              {selectionHeadingRequired ? <span className="text-[#F6776E]">*</span> : null}
            </span>
            <PatientTypeButtonGroup
              options={["Take a Photo", "Upload Photo"]}
              value={photoOption}
              onChange={setPhotoOption}
            />
          </div>
        </div>

        <div
          className={`space-y-4 flex-1 grid grid-cols-1 gap-4 ${
            showBoth ? "md:grid-cols-2" : ""
          }`}
        >
          {showVehicle && (
            <div
              ref={vehiclePhotoRef}
              className="flex flex-col gap-2"
              {...(slotDataFields?.vehiclePhoto ? { "data-field": slotDataFields.vehiclePhoto } : {})}
            >
              {photoOption.toLowerCase() === "take a photo" ? (
                <div className="group relative inline-flex w-full">
                  <span className="pointer-events-none absolute left-6 top-0 z-10 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
                    {labelVehicle}
                  </span>
                  <div
                    onClick={() => !formData.vehiclePhoto && handleOpenCamera("vehiclePhoto")}
                    className={`flex h-11 w-full cursor-pointer items-center rounded-[32px] border bg-white px-6 text-sm font-medium transition-colors ${
                      vehicleErrorText ? "border-[#F87171]" : "border-[#DFE0E2]"
                    } ${
                      formData.vehiclePhoto ? "cursor-default" : "hover:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 focus:border-[#0B8C00]"
                    }`}
                  >
                    {formData.vehiclePhoto ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[#262D3B]">
                          {formData.vehiclePhoto.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.vehiclePhoto;
                              return newErrors;
                            });
                            onChange("vehiclePhoto", null);
                          }}
                          className="relative z-10 flex shrink-0 items-center justify-center rounded-full p-1 text-[#F6776E] hover:bg-[#F6776E]/10 transition-colors"
                          aria-label="Remove file"
                        >
                          <Image src="/icons/CrossIcon.svg" alt="Remove" width={16} height={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-2">
                        <Image src="/icons/UploadIcon.svg" alt="Camera" width={20} height={20} className="shrink-0" />
                        <span className="text-sm font-medium text-[#7B8089]">Open Camera</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <FileUploadField
                  key={`vehiclePhoto-${fileFieldKeys.vehiclePhoto}`}
                  label={labelVehicle}
                  accept={accept}
                  value={formData.vehiclePhoto?.name || ""}
                  placeholder="Upload"
                  onChange={(file, fileName) => handleFileChange("vehiclePhoto", file, fileName)}
                  error={vehicleErrorText}
                />
              )}
              {photoOption.toLowerCase() === "take a photo" && vehicleErrorText ? (
                <span className="text-xs text-[#F87171]">{vehicleErrorText}</span>
              ) : null}
            </div>
          )}

          {showAadhar && (
            <div
              ref={aadharPhotoRef}
              className="flex flex-col gap-2"
              {...(slotDataFields?.aadharPhoto ? { "data-field": slotDataFields.aadharPhoto } : {})}
            >
              {photoOption.toLowerCase() === "take a photo" ? (
                <div className="group relative inline-flex w-full">
                  <span className="pointer-events-none absolute left-6 top-0 z-10 -translate-y-1/2 rounded-full bg-white px-2 text-xs font-medium text-[#7B8089]">
                    {labelAadhar}
                  </span>
                  <div
                    onClick={() => !formData.aadharPhoto && handleOpenCamera("aadharPhoto")}
                    className={`flex h-11 w-full cursor-pointer items-center rounded-[32px] border bg-white px-6 text-sm font-medium transition-colors ${
                      aadharErrorText ? "border-[#F87171]" : "border-[#DFE0E2]"
                    } ${
                      formData.aadharPhoto ? "cursor-default" : "hover:border-[#0B8C00] focus:outline-none focus:ring-2 focus:ring-[#0B8C00]/20 focus:border-[#0B8C00]"
                    }`}
                  >
                    {formData.aadharPhoto ? (
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[#262D3B]">
                          {formData.aadharPhoto.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.aadharPhoto;
                              return newErrors;
                            });
                            onChange("aadharPhoto", null);
                          }}
                          className="relative z-10 flex shrink-0 items-center justify-center rounded-full p-1 text-[#F6776E] hover:bg-[#F6776E]/10 transition-colors"
                          aria-label="Remove file"
                        >
                          <Image src="/icons/CrossIcon.svg" alt="Remove" width={16} height={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-2">
                        <Image src="/icons/UploadIcon.svg" alt="Camera" width={20} height={20} className="shrink-0" />
                        <span className="text-sm font-medium text-[#7B8089]">Open Camera</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <FileUploadField
                  key={`aadharPhoto-${fileFieldKeys.aadharPhoto}`}
                  label={labelAadhar}
                  accept={accept}
                  value={formData.aadharPhoto?.name || ""}
                  placeholder="Upload"
                  onChange={(file, fileName) => handleFileChange("aadharPhoto", file, fileName)}
                  error={aadharErrorText}
                />
              )}
              {photoOption.toLowerCase() === "take a photo" && aadharErrorText ? (
                <span className="text-xs text-[#F87171]">{aadharErrorText}</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Camera Dialog */}
      <Dialog
        open={cameraOpen}
        onClose={handleCloseCamera}
        title="Camera"
        width={700}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Camera Video Feed */}
          <div className="relative w-full rounded-[12px] overflow-hidden bg-gray-100 aspect-video">
            {cameraError ? (
              <div className="flex h-full items-center justify-center bg-gray-200">
                <p className="text-center text-sm text-red-600 px-4">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex items-center justify-center gap-4 w-full">
            <Button
              variant="outline"
              onClick={handleCloseCamera}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleTakePhoto}
              disabled={!!cameraError}
              className="min-w-[120px]"
            >
              Take a Photo
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
});

PhotoCapture.displayName = "PhotoCapture";

export default PhotoCapture;
