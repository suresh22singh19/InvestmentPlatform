"use client";

// Voice notes widget for doctor clinical assessment
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from "react";
import Image from "next/image";
import { useAudioRecorder, RecordingState } from "@/hooks/useAudioRecorder";
import { MessageDialog } from "./MessageDialog";
import { Dialog } from "./Dialog";
import { Checkbox } from "./CustomCheckbox";
import { Button } from "./Button";
import { SpinnerLoader } from "./SpinnerLoader";
import { fetchLanguageFromAPI, saveLanguageToAPI, refreshJatayuToken } from "@/store/api/jatayuApi";
import { Tooltip } from "./Tooltip";
import { NetworkStatus } from "./NetworkStatus";
import { FormSelectField } from "./FormSelectField";

const languageGroups = [
    {
        label: "Indian Languages",
        items: [
            { value: "Bengali", label: "Bengali" },
            { value: "Kannada", label: "Kannada" },
            { value: "Malayalam", label: "Malayalam" },
            { value: "Telugu", label: "Telugu" },
            { value: "Gujarati", label: "Gujarati" },
            { value: "Marathi", label: "Marathi" },
            { value: "Tamil", label: "Tamil" },
            { value: "Hindi", label: "Hindi" },
            { value: "English (India)", label: "English (India)" },
            { value: "Urdu", label: "Urdu" },
            { value: "Punjabi", label: "Punjabi" }
        ],
    },
    {
        label: "Other Languages",
        items: [
            { value: "English", label: "English" },
            { value: "Arabic", label: "Arabic" },
            { value: "Burmese", label: "Burmese" },
        ],
    },
];



export interface VoiceDoctorNotesCardProps {
    notes?: string[];
    onSaveNext?: () => void;
    className?: string;
    onAudioBlobChange?: (blob: Blob | null, duration: number) => void;
    appointment?: any;
    onTranscriptionComplete?: (summary: any, transcript: string) => void;
    onSkip?: () => void;
    onStateChange?: (states: { isRecording: boolean; isProcessing: boolean }) => void;
    hasJatayuAccess?: boolean;
    onDeleteRecording?: () => void;
    onSessionExpired?: () => void;
    isFirstSessionExpiredDialogOpen?: boolean;
}

export const VoiceDoctorNotesCard = forwardRef<any, VoiceDoctorNotesCardProps>(({
    notes = [
        "Doctor Notes Not Available!"
    ],
    onSaveNext,
    className = "",
    onAudioBlobChange,
    appointment,
    onTranscriptionComplete,
    onSkip,
    onStateChange,
    hasJatayuAccess = true,
    onDeleteRecording,
    onSessionExpired,
    isFirstSessionExpiredDialogOpen = false,
}, ref) => {
    const {
        recordingState,
        duration,
        audioUrl,
        audioBlob,
        permissionStatus,
        errorMessage,
        transcript,
        isProcessing,
        offlineProcessing,
        processingMessage,
        aiSummary,
        chunkId,
        isSessionExpired,
        audioDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        refreshDevices,
        resetError,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        deleteRecording,
        reRecord,
        retryPermissions,
    } = useAudioRecorder();

    const [showAlreadyRecordingDialog, setShowAlreadyRecordingDialog] = useState(false);
    const [showSessionExpiredDialog, setShowSessionExpiredDialog] = useState(false);
    const [isBrowserOnline, setIsBrowserOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    const [isStartingRecording, setIsStartingRecording] = useState(false);

    const micOptions = useMemo(() => {
        if (permissionStatus === "denied") {
            return [
                {
                    label: "Microphone access denied",
                    value: "denied",
                    disabled: true,
                    icon: (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    )
                }
            ];
        }

        if (!audioDevices || audioDevices.length === 0) {
            return [
                {
                    label: "No microphone detected",
                    value: "none",
                    disabled: true,
                    icon: (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    )
                }
            ];
        }

        return audioDevices.map((dev, idx) => ({
            label: dev.label ? dev.label : (audioDevices.length === 1 ? "Microphone" : `Microphone ${idx + 1}`),
            value: dev.deviceId || `mic-${idx}`,
            icon: (
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            )
        }));
    }, [audioDevices, permissionStatus]);

    const isRecordingOrProcessing =
        recordingState === RecordingState.RECORDING ||
        recordingState === RecordingState.PAUSED ||
        recordingState === RecordingState.REQUESTING_PERMISSION ||
        isProcessing;

    useEffect(() => {
        if (isSessionExpired && !isFirstSessionExpiredDialogOpen && isRecordingOrProcessing) {
            setShowSessionExpiredDialog(true);
        }
    }, [isSessionExpired, isFirstSessionExpiredDialogOpen, isRecordingOrProcessing]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleInitialSessionExpired = () => {
            // Initial Start Recording check failed -> handled by parent doctorActivity.tsx (2nd image Dialog)
            setShowSessionExpiredDialog(false);
        };

        const handleSessionExpiredEvent = () => {
            // Session expired during recording or API call (upload-and-transcribe / end-stream) -> show 3rd image MessageDialog
            if (!isFirstSessionExpiredDialogOpen) {
                setShowSessionExpiredDialog(true);
            }
        };

        window.addEventListener("jatayu:initial_session_expired", handleInitialSessionExpired);
        window.addEventListener("jatayu:session_expired", handleSessionExpiredEvent);
        return () => {
            window.removeEventListener("jatayu:initial_session_expired", handleInitialSessionExpired);
            window.removeEventListener("jatayu:session_expired", handleSessionExpiredEvent);
        };
    }, [isFirstSessionExpiredDialogOpen]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleOnline = () => setIsBrowserOnline(true);
        const handleOffline = () => setIsBrowserOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const handleStartRecording = async () => {
        setIsStartingRecording(true);
        try {
            if (typeof window !== "undefined") {
                const isRecordingActive = localStorage.getItem("ai_voice_recording_active") === "true";
                if (isRecordingActive) {
                    // Verify with other tabs via BroadcastChannel to see if anyone is actually recording
                    try {
                        const bc = new BroadcastChannel("voice_ai_recording_channel");
                        let hasActiveTab = false;

                        const listener = (event: MessageEvent) => {
                            if (event.data?.type === "PONG_RECORDING") {
                                hasActiveTab = true;
                            }
                        };
                        bc.addEventListener("message", listener);
                        bc.postMessage({ type: "PING_RECORDING" });

                        // Wait 150ms for response
                        await new Promise((resolve) => setTimeout(resolve, 150));

                        bc.removeEventListener("message", listener);
                        bc.close();

                        if (hasActiveTab) {
                            setShowAlreadyRecordingDialog(true);
                            setIsStartingRecording(false);
                            return;
                        } else {
                            // Stale local storage data detected, clear it
                            localStorage.setItem("ai_voice_recording_active", "false");
                            localStorage.removeItem("ai_voice_recording_session_id");
                        }
                    } catch (bcError) {
                        console.error("BroadcastChannel check failed, falling back to local check:", bcError);
                        setShowAlreadyRecordingDialog(true);
                        setIsStartingRecording(false);
                        return;
                    }
                }
            }
            const generatedId = await startRecording(appointment, selectedLanguage);
            if (generatedId && typeof window !== "undefined") {
                localStorage.setItem("ai_voice_recording_active", "true");
                localStorage.setItem("ai_voice_recording_session_id", generatedId);
            }
        } finally {
            setIsStartingRecording(false);
        }
    };

    useImperativeHandle(ref, () => ({
        startRecording: () => {
            if (hasJatayuAccess) {
                handleStartRecording();
            }
        }
    }));

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!isRecordingOrProcessing) {
            const activeSessionId = localStorage.getItem("ai_voice_recording_session_id");
            if (activeSessionId && activeSessionId === chunkId) {
                localStorage.setItem("ai_voice_recording_active", "false");
                localStorage.removeItem("ai_voice_recording_session_id");
            }
        }
    }, [isRecordingOrProcessing, chunkId]);

    useEffect(() => {
        const handleUnload = () => {
            const activeSessionId = localStorage.getItem("ai_voice_recording_session_id");
            if (activeSessionId && activeSessionId === chunkId) {
                localStorage.setItem("ai_voice_recording_active", "false");
                localStorage.removeItem("ai_voice_recording_session_id");
            }
        };

        window.addEventListener("beforeunload", handleUnload);
        window.addEventListener("unload", handleUnload);

        return () => {
            handleUnload();
            window.removeEventListener("beforeunload", handleUnload);
            window.removeEventListener("unload", handleUnload);
        };
    }, [chunkId]);

    useEffect(() => {
        if (typeof window === "undefined" || !window.BroadcastChannel) return;

        const bc = new BroadcastChannel("voice_ai_recording_channel");
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "PING_RECORDING") {
                if (
                    recordingState === RecordingState.RECORDING ||
                    recordingState === RecordingState.PAUSED ||
                    recordingState === RecordingState.REQUESTING_PERMISSION ||
                    isProcessing
                ) {
                    bc.postMessage({ type: "PONG_RECORDING" });
                }
            }
        };

        bc.addEventListener("message", handleMessage);
        return () => {
            bc.removeEventListener("message", handleMessage);
            bc.close();
        };
    }, [recordingState, isProcessing]);


    const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);

    useEffect(() => {
        if (
            recordingState === RecordingState.ERROR &&
            errorMessage === "Facing an API error while processing the recorded voice. Please try again."
        ) {
            setShowApiErrorDialog(true);
        }
    }, [recordingState, errorMessage]);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Confirmation dialog states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showReRecordDialog, setShowReRecordDialog] = useState(false);

    // Collapsible Doctor's Notes state
    const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);

    // Language modal states
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [tempSelectedLanguage, setTempSelectedLanguage] = useState("Auto (Default)");
    const [selectedLanguage, setSelectedLanguage] = useState("Auto (Default)");
    const [isDefaultCheckbox, setIsDefaultCheckbox] = useState(false);
    const [tempDefaultCheckbox, setTempDefaultCheckbox] = useState(false);
    const [isSavingLanguage, setIsSavingLanguage] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Load persisted settings and fetch from API on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedLang = localStorage.getItem("voiceTranscriptionLanguage");
            const savedDefault = localStorage.getItem("voiceTranscriptionLanguageDefault");
            if (savedLang) {
                setSelectedLanguage(savedLang);
                setTempSelectedLanguage(savedLang);
            }
            if (savedDefault === "true") {
                setIsDefaultCheckbox(true);
                setTempDefaultCheckbox(true);
            }
        }

        const loadLang = async () => {
            const apiLang = await fetchLanguageFromAPI();
            if (apiLang) {
                setSelectedLanguage(apiLang);
                setTempSelectedLanguage(apiLang);
                if (typeof window !== "undefined") {
                    localStorage.setItem("voiceTranscriptionLanguage", apiLang);
                }
            }
        };
        loadLang();
    }, []);

    const handleSaveLanguage = async () => {
        if (isSavingLanguage) return;
        setIsSavingLanguage(true);

        try {
            const success = await saveLanguageToAPI(tempSelectedLanguage, tempDefaultCheckbox);
            if (success) {
                setSelectedLanguage(tempSelectedLanguage);
                setIsDefaultCheckbox(tempDefaultCheckbox);
                if (typeof window !== "undefined") {
                    localStorage.setItem("voiceTranscriptionLanguage", tempSelectedLanguage);
                    localStorage.setItem("voiceTranscriptionLanguageDefault", String(tempDefaultCheckbox));
                }
                setSuccessMessage("Language settings saved successfully!");
                setIsLanguageModalOpen(false);
                setShowSuccessDialog(true);
            } else {
                setSuccessMessage("Failed to save language preference. Please try again.");
                setShowSuccessDialog(true);
            }
        } catch (error) {
            console.error("Error in handleSaveLanguage:", error);
            setSuccessMessage("An unexpected error occurred. Please try again.");
            setShowSuccessDialog(true);
        } finally {
            setIsSavingLanguage(false);
        }
    };

    const handleCancelLanguage = () => {
        if (isSavingLanguage) return;
        setTempSelectedLanguage(selectedLanguage);
        setTempDefaultCheckbox(isDefaultCheckbox);
        setIsLanguageModalOpen(false);
    };

    // Reference to audio player element
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Auto scroll to top of this card on mount (when Step 1 is active)
    useEffect(() => {
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    // Fallback display duration using recorded duration if metadata is invalid, 0, Infinity, or NaN
    const displayDuration = (audioDuration && isFinite(audioDuration) && !isNaN(audioDuration))
        ? audioDuration
        : duration;

    // Reset playback stats when audioUrl changes
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setAudioDuration(0);
        setPlaybackSpeed(1);
    }, [audioUrl]);

    // Refs to store parent callbacks and avoid infinite render loops
    const onAudioBlobChangeRef = useRef(onAudioBlobChange);
    const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);
    const onStateChangeRef = useRef(onStateChange);

    useEffect(() => {
        onAudioBlobChangeRef.current = onAudioBlobChange;
        onTranscriptionCompleteRef.current = onTranscriptionComplete;
        onStateChangeRef.current = onStateChange;
    });

    // Bubble up audio blob and duration changes to the parent
    useEffect(() => {
        onAudioBlobChangeRef.current?.(audioBlob, displayDuration);
    }, [audioBlob, displayDuration]);

    // Trigger onTranscriptionComplete when streaming finalizes
    useEffect(() => {
        if (recordingState === RecordingState.STOPPED && !isProcessing && aiSummary) {
            onTranscriptionCompleteRef.current?.(aiSummary, transcript);
        }
    }, [recordingState, isProcessing, aiSummary, transcript]);

    // Bubble up active recording and processing states to the parent
    const isRecordingActive =
        recordingState === RecordingState.RECORDING ||
        recordingState === RecordingState.PAUSED ||
        recordingState === RecordingState.REQUESTING_PERMISSION;

    useEffect(() => {
        onStateChangeRef.current?.({
            isRecording: isRecordingActive,
            isProcessing: isProcessing,
        });
    }, [isRecordingActive, isProcessing]);

    // Wave tick animation state for the recording visualizer
    const [waveTick, setWaveTick] = useState(0);
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (recordingState === RecordingState.RECORDING) {
            interval = setInterval(() => {
                setWaveTick((t) => t + 1);
            }, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [recordingState]);

    const formatTime = (totalSeconds: number) => {
        if (isNaN(totalSeconds) || totalSeconds === Infinity) return "00:00";
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Playback control functions
    const togglePlayPause = () => {
        const audio = audioPlayerRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play()
                .then(() => {
                    setIsPlaying(true);
                })
                .catch((err) => {
                    console.error("Playback error:", err);
                    alert("Unable to play recorded audio.");
                });
        }
    };

    const handleTimeUpdate = () => {
        if (audioPlayerRef.current) {
            setCurrentTime(audioPlayerRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioPlayerRef.current) {
            setAudioDuration(audioPlayerRef.current.duration);
        }
    };

    const handlePlaybackEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (time: number) => {
        const audio = audioPlayerRef.current;
        if (!audio) return;
        audio.currentTime = time;
        setCurrentTime(time);
    };

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.playbackRate = speed;
        }
    };

    const seekBackward = () => {
        handleSeek(Math.max(0, currentTime - 5));
    };

    const seekForward = () => {
        handleSeek(Math.min(displayDuration, currentTime + 5));
    };

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

    const handleReRecord = () => {
        setShowReRecordDialog(true);
    };

    const handleDownload = () => {
        if (!audioUrl) return;
        const patientName = (appointment?.patientName || "Patient").trim();
        const uhid = (appointment?.uhid || "audio").trim();
        const baseName = `${patientName}-${uhid}`;
        const fileName = baseName
            .toUpperCase()
            .replace(/[\s-]/g, "_")
            .replace(/[^A-Z0-9_]/g, "");

        const a = document.createElement("a");
        a.href = audioUrl;
        a.download = `${fileName}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div
            ref={containerRef}
            className={`relative rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 ${className}`}>

            {/* Language Settings Button has been moved into the centered toolbar layout */}
            {/*  add here Skip button audio option when Start Recording is  */}
            {/* Hidden native audio element */}
            {audioUrl && (
                <audio
                    ref={audioPlayerRef}
                    src={audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handlePlaybackEnded}
                />
            )}

            {/* Voice Dictation Centered Controls */}
            <div className="flex flex-col items-center justify-center w-full min-h-[96px] py-2">

                {/* Initial / Error States: Show Action Buttons Bar at Top (Hidden during Recording, Processing & Audio Review) */}
                {recordingState !== RecordingState.RECORDING &&
                    recordingState !== RecordingState.PAUSED &&
                    recordingState !== RecordingState.STOPPED &&
                    !isProcessing &&
                    !audioBlob &&
                    !audioUrl && (
                        <div className="flex flex-col items-center gap-4 transition-all w-full">
                            {/* Top Buttons Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                                {!hasJatayuAccess ? (
                                    <Tooltip content="Voice AI Access is not active">
                                        <span className="inline-block cursor-not-allowed">
                                            <Button
                                                variant="primary"
                                                disabled={true}
                                                className="!rounded-full !font-semibold !text-sm !shadow-md flex items-center justify-center gap-2.5 h-11 px-6 !border-none !bg-gradient-to-r !from-[#0B8C00] !to-[#12A006] opacity-60 pointer-events-none"
                                                leftIcon={
                                                    <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center relative shadow-sm">
                                                        <span className="absolute w-2 h-2 rounded-full bg-gray-400" />
                                                    </span>
                                                }
                                            >
                                                Start Recording
                                            </Button>
                                        </span>
                                    </Tooltip>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={handleStartRecording}
                                        disabled={isStartingRecording || recordingState === RecordingState.REQUESTING_PERMISSION}
                                        className={`!rounded-full !font-semibold !text-sm !shadow-md transition-all flex items-center justify-center gap-2.5 h-11 px-6 !border-none !text-white ${(isStartingRecording || recordingState === RecordingState.REQUESTING_PERMISSION)
                                            ? "!bg-[#0B8C00]/80 cursor-not-allowed opacity-90"
                                            : "hover:!shadow-lg hover:!scale-[1.02] active:!scale-[0.98] !bg-gradient-to-r !from-[#0B8C00] !to-[#12A006] hover:!from-[#0A7F00] hover:!to-[#0B8C00]"
                                            }`}
                                        leftIcon={
                                            (isStartingRecording || recordingState === RecordingState.REQUESTING_PERMISSION) ? (
                                                <SpinnerLoader size={18} color="white" className="!text-white" />
                                            ) : (
                                                <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center relative shadow-sm">
                                                    <span className="absolute w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
                                                    <span className="absolute w-2 h-2 rounded-full bg-[#EF4444]" />
                                                </span>
                                            )
                                        }
                                    >
                                        Start Recording
                                    </Button>
                                )}

                                {onSkip && (
                                    <Button
                                        variant="outline"
                                        onClick={onSkip}
                                        className="!border-[#DFE7DF] !text-[#434956] hover:!bg-[#F2F8F2] hover:!border-[#0B8C00]/30 hover:!text-[#0B8C00] hover:!scale-[1.02] active:!scale-[0.98] !rounded-full transition-all flex items-center justify-center gap-2.5 h-11 px-6 !shadow-[0px_4px_12px_rgba(0,0,0,0.02)]"
                                        leftIcon={
                                            <svg className="w-4 h-4 text-gray-500 hover:text-[#0B8C00] transition-colors" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                            </svg>
                                        }
                                    >
                                        Skip AI Recording
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setIsLanguageModalOpen(true)}
                                    disabled={!hasJatayuAccess}
                                    className={`!border-[#DFE7DF] !text-[#434956] hover:!bg-[#F2F8F2] hover:!border-[#0B8C00]/30 hover:!text-[#0B8C00] hover:!scale-[1.02] active:!scale-[0.98] !rounded-full transition-all flex items-center justify-center gap-2.5 h-11 px-6 !shadow-[0px_4px_12px_rgba(0,0,0,0.02)] ${!hasJatayuAccess ? "opacity-60 pointer-events-none cursor-not-allowed" : ""}`}
                                    leftIcon={
                                        <svg className="w-4 h-4 text-gray-500 hover:text-[#0B8C00] transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    }
                                >
                                    Language: {selectedLanguage}
                                </Button>

                                {recordingState !== RecordingState.ERROR && audioDevices && (
                                    <div className="w-[220px]">
                                        <FormSelectField
                                            label="Microphone"
                                            hideLabel={true}
                                            options={micOptions}
                                            value={permissionStatus === "denied" ? "denied" : (selectedDeviceId || (micOptions[0]?.value ?? ""))}
                                            onChange={(val) => {
                                                if (typeof val === "string" && val !== "denied" && val !== "none") {
                                                    setSelectedDeviceId(val);
                                                }
                                            }}
                                            placeholder={permissionStatus === "denied" ? "Microphone access denied" : "Select Microphone"}
                                            searchPlaceholder={permissionStatus === "denied" ? "Microphone access denied" : "Search microphone..."}
                                            disabled={permissionStatus === "denied"}
                                            background="white"
                                            dropdownWidth="500px"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bottom Area (Down of current UI) */}
                            {permissionStatus === "denied" ? (
                                <div className="flex flex-col items-center gap-4 bg-[#FFF5F5] border border-[#FEE2E2] p-5 rounded-[20px] text-center w-full max-w-lg transition-all mt-2">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-red-800 text-sm">Microphone access is blocked.</h4>
                                        <p className="text-xs text-red-600">Please enable microphone access in your browser settings to record notes.</p>
                                    </div>

                                    <div className="w-full text-left text-xs bg-white border border-[#FEE2E2] p-4 rounded-xl space-y-2 text-gray-600 shadow-sm">
                                        <p className="font-semibold text-gray-700">Instructions to enable:</p>
                                        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                                            <li><strong>Chrome:</strong> Click the lock icon near the URL → Site Settings → Microphone → Change to <strong>Allow</strong> → Refresh page.</li>
                                            <li><strong>Firefox:</strong> Click the permissions icon in the address bar → Clear "Blocked" status.</li>
                                            <li><strong>Safari:</strong> Go to Website Settings → Allow microphone permission.</li>
                                        </ul>
                                    </div>

                                    {/* <button
                                    onClick={retryPermissions}
                                    className="px-5 py-2.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 active:scale-98 transition-all shadow-sm cursor-pointer"
                                >
                                    Retry & Check Permission
                                </button> */}
                                </div>
                            ) : recordingState === RecordingState.ERROR ? (
                                <div className="flex flex-col items-center gap-4 bg-[#FFF5F5] border border-[#FEE2E2] p-5 rounded-[20px] text-center w-full max-w-lg transition-all mt-2">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 shadow-inner">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                                        </svg>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-red-800 text-sm">Microphone Error</h4>
                                        <p className="text-xs text-red-600 leading-relaxed">
                                            {errorMessage || "No microphone detected or error accessing recording device. Please connect a microphone and try again."}
                                        </p>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            resetError();
                                            await refreshDevices();
                                            handleStartRecording();
                                        }}
                                        className="px-5 py-2.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 active:scale-98 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Retry Microphone
                                    </button>
                                </div>
                            ) : permissionStatus === "unsupported" ? (
                                <div className="flex flex-col items-center gap-3 bg-[#FFF5F5] border border-[#FEE2E2] p-5 rounded-[20px] text-center w-full max-w-md mt-2">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-semibold text-red-800 text-sm">Browser Not Supported</h4>
                                    <p className="text-xs text-red-600 leading-relaxed">
                                        {errorMessage || "Audio recording is not supported in this browser or environment (ensure you are using HTTPS)."}
                                    </p>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 font-medium">Click to request microphone access and start recording</span>
                            )}
                        </div>
                    )}

                {/* 4. Active Recording / Paused State */}
                {(recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) && (
                    <div className="flex flex-col items-center gap-4 w-full max-w-sm transition-all">

                        <div className="flex items-center gap-4 bg-[#FCF5E9] px-6 py-3 rounded-[32px] border border-[#F3E6D0] shadow-sm w-full justify-between">
                            {/* Left: Mic Icon and status */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm text-[#8B670A]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-[#8B670A] uppercase tracking-wider">
                                        {recordingState === RecordingState.RECORDING ? "Recording" : "Paused"}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-[#434956] leading-none">
                                        {formatTime(duration)}
                                    </span>
                                </div>
                            </div>

                            {/* Center/Right: Action Buttons */}
                            <div className="flex items-center gap-2">
                                {/* Pause/Resume */}
                                <NetworkStatus />
                                <button
                                    onClick={recordingState === RecordingState.RECORDING ? pauseRecording : resumeRecording}
                                    className={`w-9 h-9 cursor-pointer rounded-full flex items-center justify-center transition-all bg-white border border-[#E5E7EB] hover:scale-105 active:scale-95 shadow-sm`}
                                    title={recordingState === RecordingState.RECORDING ? "Pause" : "Resume"}
                                >
                                    {recordingState === RecordingState.RECORDING ? (
                                        <svg className="w-3.5 h-3.5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M18 16V8a1 1 0 00-1-1h-2a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1zm-8 0V8a1 1 0 00-1-1H7a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5 text-[#0B8C00] pl-0.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Stop */}
                                <button
                                    onClick={stopRecording}
                                    className="px-4 py-2 cursor-pointer rounded-full font-bold text-xs border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 hover:scale-102 active:scale-98 transition-all shadow-sm"
                                    title="Stop Recording"
                                >
                                    Stop
                                </button>
                            </div>
                        </div>

                        {/* Interactive Waveform visualization */}
                        <div className="w-full flex items-end justify-between h-8 px-4 gap-[4px] opacity-90 py-1 bg-gray-50 rounded-xl border border-gray-150">
                            {[...Array(24)].map((_, i) => {
                                const heights = [25, 45, 30, 60, 40, 75, 50, 90, 65, 35, 55, 80, 70, 40, 85, 60, 30, 50, 70, 40, 60, 35, 45, 25];
                                const staticHeight = heights[i % heights.length];
                                const isPlayingWave = recordingState === RecordingState.RECORDING;
                                const activeHeight = isPlayingWave
                                    ? Math.max(15, Math.sin((waveTick + i) * 0.4) * 35 + 50)
                                    : 15;
                                return (
                                    <div
                                        key={i}
                                        className="w-1 rounded-full transition-all duration-100 bg-[#0B8C00]"
                                        style={{
                                            height: `${isPlayingWave ? activeHeight : staticHeight / 2}%`,
                                        }}
                                    />
                                );
                            })}
                        </div>

                    </div>
                )}

                {/* 5. Stopped / Completed State (Custom Player preview) */}
                {recordingState === RecordingState.STOPPED && audioUrl && !isProcessing && (
                    <div className="flex flex-col gap-4 p-5 bg-[#F6FAF6] rounded-2xl border border-[#E3EEE1] w-full max-w-lg shadow-sm transition-all">

                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#0B8C00] uppercase tracking-wider">Audio Review</span>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleReRecord}
                                    className="text-xs cursor-pointer font-semibold text-[#0B8C00] hover:text-[#097300] hover:underline"
                                >
                                    Re-record
                                </button>
                                <span className="text-gray-300 text-sm">|</span>
                                <button
                                    onClick={handleDelete}
                                    className="text-xs cursor-pointer font-semibold text-red-500 hover:text-red-700 hover:underline"
                                >
                                    Delete
                                </button>
                                {/* <span className="text-gray-300 text-sm">|</span>
                                <button
                                    onClick={handleDownload}
                                    className="text-xs cursor-pointer font-semibold text-[#0B8C00] hover:text-[#097300] hover:underline flex items-center gap-1"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16.875 11.75C16.9082 11.75 16.9404 11.7627 16.9639 11.7861C16.9873 11.8096 17 11.8418 17 11.875V16.25C17 16.4489 16.9209 16.6396 16.7803 16.7803C16.6396 16.9209 16.4489 17 16.25 17H3.75C3.55109 17 3.36038 16.9209 3.21973 16.7803C3.07907 16.6396 3 16.4489 3 16.25V11.875C3 11.8418 3.01269 11.8096 3.03613 11.7861C3.05957 11.7627 3.09185 11.75 3.125 11.75C3.15815 11.75 3.19043 11.7627 3.21387 11.7861C3.23731 11.8096 3.25 11.8418 3.25 11.875V16.75H16.75V11.875C16.75 11.8418 16.7627 11.8096 16.7861 11.7861C16.8096 11.7627 16.8418 11.75 16.875 11.75ZM10 3C10.0332 3 10.0654 3.01269 10.0889 3.03613C10.1123 3.05957 10.125 3.09185 10.125 3.125V11.5742L10.9785 10.7197L13.0361 8.66113C13.0478 8.64949 13.0619 8.64009 13.0771 8.63379C13.0923 8.62756 13.1086 8.625 13.125 8.625C13.1414 8.625 13.1577 8.62756 13.1729 8.63379C13.1881 8.64009 13.2022 8.64949 13.2139 8.66113C13.2255 8.67277 13.2349 8.68694 13.2412 8.70215C13.2474 8.71729 13.25 8.73363 13.25 8.75C13.25 8.76637 13.2474 8.78271 13.2412 8.79785C13.2349 8.81306 13.2255 8.82723 13.2139 8.83887L10.0889 11.9639C10.0773 11.9755 10.063 11.9849 10.0479 11.9912C10.0327 11.9975 10.0164 12.001 10 12.001C9.9836 12.001 9.96729 11.9975 9.95215 11.9912C9.93697 11.9849 9.92274 11.9755 9.91113 11.9639L6.78613 8.83887C6.76263 8.81536 6.75 8.78325 6.75 8.75L6.75879 8.70215C6.76503 8.68699 6.77432 8.67295 6.78613 8.66113C6.80964 8.63763 6.84176 8.625 6.875 8.625C6.90824 8.625 6.94036 8.63763 6.96387 8.66113L9.02148 10.7197L9.875 11.5742V3.125C9.875 3.09185 9.88769 3.05958 9.91113 3.03613C9.92283 3.02444 9.93717 3.01599 9.95215 3.00977L10 3Z" stroke="currentColor" strokeWidth="0.5" />
                                    </svg>
                                    Download
                                </button> */}
                                {/* here add downalod button that help to downalod the recoreded audio ok  */}
                            </div>
                        </div>

                        {/* Audio Waveform visualization */}
                        <div className="flex items-end justify-between h-9 w-full px-3 gap-[3px] bg-white rounded-xl border border-gray-150 py-1.5 shadow-inner">
                            {[...Array(30)].map((_, i) => {
                                const progress = (currentTime / (displayDuration || 1)) * 30;
                                const isActive = i < progress;
                                const heights = [20, 45, 30, 60, 40, 75, 50, 90, 65, 35, 55, 80, 70, 40, 85, 60, 30, 50, 70, 40, 60, 35, 45, 20, 50, 70, 35, 60, 45, 20];
                                const height = heights[i % heights.length];
                                return (
                                    <div
                                        key={i}
                                        onClick={() => handleSeek(((i + 0.5) / 30) * displayDuration)}
                                        className={`w-1 rounded-full transition-colors duration-150 cursor-pointer hover:bg-[#0B8C00]/70`}
                                        style={{
                                            height: `${height}%`,
                                            backgroundColor: isActive ? "#0B8C00" : "#D1D5DB"
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Custom Player Controls */}
                        <div className="flex items-center justify-between gap-4">

                            {/* Left: Playback Actions */}
                            <div className="flex items-center gap-2">
                                {/* Seek Backward */}
                                <button
                                    onClick={seekBackward}
                                    className="p-2 cursor-pointer rounded-full hover:bg-gray-150 text-gray-600 active:scale-95 transition-all"
                                    title="Seek Backward 5s"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 19.25l-7.25-7.25 7.25-7.25M20 19.25l-7.25-7.25 7.25-7.25" />
                                    </svg>
                                </button>

                                {/* Play/Pause Toggle */}
                                <button
                                    onClick={togglePlayPause}
                                    className="p-3 cursor-pointer rounded-full bg-[#0B8C00] text-white hover:bg-[#097300] transition-transform hover:scale-105 active:scale-95 shadow-md flex items-center justify-center w-11 h-11"
                                    title={isPlaying ? "Pause Playback" : "Play Playback"}
                                >
                                    {isPlaying ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path fillRule="evenodd" d="M18 16V8a1 1 0 00-1-1h-2a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1zm-8 0V8a1 1 0 00-1-1H7a1 1 0 00-1 1v8a1 1 0 001 1h2a1 1 0 001-1z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Seek Forward */}
                                <button
                                    onClick={seekForward}
                                    className="p-2 cursor-pointer rounded-full hover:bg-gray-150 text-gray-600 active:scale-95 transition-all"
                                    title="Seek Forward 5s"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 4.75l7.25 7.25-7.25 7.25M4 4.75l7.25 7.25-7.25 7.25" />
                                    </svg>
                                </button>
                            </div>

                            {/* Center: Custom progress bar and time text */}
                            <div className="flex-1 flex flex-col gap-1">
                                <input
                                    type="range"
                                    min={0}
                                    max={displayDuration || 1}
                                    value={currentTime}
                                    onChange={(e) => handleSeek(Number(e.target.value))}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0B8C00]"
                                />
                                <div className="flex justify-between text-[10px] text-gray-500 font-bold leading-none mt-1">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(displayDuration)}</span>
                                </div>
                            </div>

                            {/* Right: Playback Speed Dropdown */}
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                                {[1, 1.5, 2].map((speed) => (
                                    <button
                                        key={speed}
                                        onClick={() => handleSpeedChange(speed)}
                                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded transition-all leading-none ${playbackSpeed === speed
                                            ? "bg-[#0B8C00] text-white"
                                            : "text-gray-500 hover:bg-gray-100"
                                            }`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* 6. Processing / Finalizing State */}
                {isProcessing && (
                    <div className={`flex flex-col items-center gap-4 p-6 rounded-2xl text-center w-full max-w-lg shadow-sm transition-all border ${offlineProcessing && !isBrowserOnline
                        ? "bg-[#FFF5F5] border-[#FEE2E2]"
                        : "bg-[#F6FAF6] border-[#E3EEE1]"
                        }`}>
                        <div className="flex items-center gap-3">
                            <NetworkStatus />
                            {(isBrowserOnline || !offlineProcessing) && <SpinnerLoader size={24} />}
                        </div>

                        <div className="space-y-1.5">
                            <h4 className={`font-semibold text-sm ${offlineProcessing && !isBrowserOnline ? "text-red-800" : "text-gray-800"
                                }`}>
                                {offlineProcessing && !isBrowserOnline ? "Connection Issues Detected" : "Processing Audio Stream"}
                            </h4>
                            <p className={`text-xs ${offlineProcessing && !isBrowserOnline
                                ? "text-red-600 font-medium"
                                : (processingMessage && processingMessage.includes("Sending chunks")
                                    ? "text-[#0B8C00] font-semibold animate-pulse"
                                    : "text-gray-500")
                                }`}>
                                {processingMessage || "Retrieving final clinical summary and transcribing..."}
                            </p>
                        </div>

                        {offlineProcessing && !isBrowserOnline && (
                            <div className="text-[11px] text-red-500 bg-white border border-[#FEE2E2] px-3 py-1.5 rounded-lg max-w-xs shadow-inner">
                                Please restore your internet connection. The system will automatically resume processing your recording without data loss once connection is verified.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Doctor's Notes Section */}
            <div className="space-y-4">
                {/* <div
                    onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                    className="flex items-center justify-between cursor-pointer group"
                >
                    <span className="font-inter font-semibold text-base text-[#262D3B] group-hover:text-[#0B8C00] transition-colors">Doctor's Notes:</span>
                    <button className="text-gray-500 group-hover:text-[#0B8C00] transition-colors">
                        <svg
                            className={`w-5 h-5 transform transition-transform duration-200 ${isNotesCollapsed ? "" : "rotate-180"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div> */}

                {/* {!isNotesCollapsed && (
                    <div className="rounded-xl border border-[#E3EEE1] bg-[#F2F8F2]/30 p-5 min-h-[100px]">
                        {transcript ? (
                            <p className="font-inter text-sm text-[#434956] leading-relaxed whitespace-pre-wrap">
                                {transcript}
                            </p>
                        ) : (
                            notes.map((paragraph, idx) => (
                                <p
                                    key={idx}
                                    className={`font-inter text-sm text-[#434956] leading-relaxed ${idx === notes.length - 1 ? "" : "mb-4"}`}
                                >
                                    {paragraph}
                                </p>
                            ))
                        )}
                    </div>
                )} */}
            </div>

            {/* Delete Confirmation Dialog */}
            <MessageDialog
                open={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                icon="/icons/questionMark.svg"
                // iconBgColor="#FFEBEE"
                message="Are you sure you want to delete this recording?"
                confirmText="Delete"
                cancelText="Cancel"
                showCancel={true}
                onConfirm={() => {
                    deleteRecording();
                    onDeleteRecording?.();
                    setShowDeleteDialog(false);
                }}
                onCancel={() => setShowDeleteDialog(false)}
            />

            {/* Re-record Confirmation Dialog */}
            <MessageDialog
                open={showReRecordDialog}
                onClose={() => setShowReRecordDialog(false)}
                icon="/icons/questionMark.svg"
                // iconBgColor="#FFEBEE"
                message="Are you sure you want to delete the current recording and start a new one?"
                confirmText="Re-record"
                cancelText="Cancel"
                showCancel={true}
                onConfirm={() => {
                    reRecord();
                    onDeleteRecording?.();
                    setShowReRecordDialog(false);
                }}
                onCancel={() => setShowReRecordDialog(false)}
            />

            {/* Language Settings Modal */}
            <Dialog
                open={isLanguageModalOpen}
                onClose={handleCancelLanguage}
                title="Language Settings"
                width={620}
                contentPadding="px-6 py-6"
            >
                <div className="space-y-4">
                    <p className="text-xs text-gray-500 leading-normal">
                        Select the language for voice transcription:
                    </p>

                    <div className="space-y-4">
                        {languageGroups.map((group) => (
                            <div key={group.label} className="space-y-2">
                                <h4 className="text-[10px] font-extrabold text-[#626B7F] uppercase tracking-wider">
                                    {group.label}
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {group.items.map((item) => {
                                        const isSelected = tempSelectedLanguage === item.value;
                                        return (
                                            <Button
                                                key={item.value}
                                                type="button"
                                                onClick={() => setTempSelectedLanguage(item.value)}
                                                variant={isSelected ? "primary" : "outline"}
                                                size="small"
                                                fullWidth={true}
                                                style={!isSelected ? { borderColor: '#E5E7EB', color: '#374151', backgroundColor: '#FFFFFF' } : undefined}
                                                className={isSelected ? "font-extrabold" : ""}
                                            >
                                                {item.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Auto (Default) Button */}
                    <div className="flex gap-2 justify-end grid grid-cols-2">
                        <Button
                            type="button"
                            onClick={() => setTempSelectedLanguage("Auto (Default)")}
                            variant={tempSelectedLanguage === "Auto (Default)" ? "primary" : "outline"}
                            // size="medium"
                            // fullWidth={true}
                            style={tempSelectedLanguage !== "Auto (Default)" ? { borderColor: '#E5E7EB', color: '#374151', backgroundColor: '#FFFFFF' } : undefined}
                        // className="mt-3 font-bold"
                        >
                            Auto (Default)
                        </Button>

                        {/* Selection Preview Box */}
                        <div className="p-3 bg-[#E8F5E9]/60 border border-[#C8E6C9] px-6 rounded-[24px] text-xs font-bold text-[#0B8C00] flex items-center justify-between">
                            <span>Selected:</span>
                            <span>{tempSelectedLanguage}</span>
                        </div>

                    </div>

                    {/* Checkbox "Set as my default language" */}
                    <div className="pt-3 border-t border-[#DFE0E2] flex items-center gap-2">
                        <Checkbox
                            checked={tempDefaultCheckbox}
                            onChange={(val) => setTempDefaultCheckbox(val)}
                        />
                        <span
                            onClick={() => setTempDefaultCheckbox(!tempDefaultCheckbox)}
                            className="text-xs font-semibold text-gray-700 select-none cursor-pointer"
                        >
                            Set as my default language
                        </span>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            onClick={handleSaveLanguage}
                            variant="primary"
                            size="small"
                            isLoading={isSavingLanguage}
                            disabled={isSavingLanguage}
                        >
                            Save
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCancelLanguage}
                            variant="outline"
                            size="small"
                            disabled={isSavingLanguage}
                            style={{ borderColor: '#E5E7EB', color: '#374151', backgroundColor: '#FFFFFF' }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Success/Error Message Dialog */}
            <MessageDialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                icon={successMessage.toLowerCase().includes("fail") || successMessage.toLowerCase().includes("error") ? "/icons/CrossIcon.svg" : "/icons/SuccessCheck.svg"}
                iconBgColor={successMessage.toLowerCase().includes("fail") || successMessage.toLowerCase().includes("error") ? "#FFEBEE" : "#E8F5E9"}
                message={successMessage}
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowSuccessDialog(false)}
            />

            {/* Already Recording Warning Dialog */}
            <MessageDialog
                open={showAlreadyRecordingDialog}
                onClose={() => setShowAlreadyRecordingDialog(false)}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message="During current time Ai Voice Feature already using for a patient please wait or proceduce without Ai Voice feature ok "
                confirmText="OK"
                showCancel={false}
                onConfirm={() => setShowAlreadyRecordingDialog(false)}
            />

            {/* Session Expired Warning Dialog */}
            <MessageDialog
                open={showSessionExpiredDialog}
                onClose={() => {
                    setShowSessionExpiredDialog(false);
                    if (onSessionExpired) {
                        onSessionExpired();
                    } else if (onSkip) {
                        onSkip();
                    }
                }}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message="This doctor is already using the Voice AI feature in another session. You cannot use the Voice AI feature because the current session has expired"
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowSessionExpiredDialog(false);
                    if (onSessionExpired) {
                        onSessionExpired();
                    } else if (onSkip) {
                        onSkip();
                    }
                }}
            />

            {/* API Error Dialog */}
            <MessageDialog
                open={showApiErrorDialog}
                onClose={() => {
                    setShowApiErrorDialog(false);
                    deleteRecording();
                }}
                icon="/icons/CrossIcon.svg"
                iconBgColor="#FFEBEE"
                message="Facing an API error while processing the recorded voice. Please try again."
                confirmText="OK"
                showCancel={false}
                onConfirm={() => {
                    setShowApiErrorDialog(false);
                    deleteRecording();
                }}
            />
        </div>
    );
});

VoiceDoctorNotesCard.displayName = "VoiceDoctorNotesCard";
