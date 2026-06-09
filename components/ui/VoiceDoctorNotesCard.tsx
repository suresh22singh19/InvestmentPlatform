"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAudioRecorder, RecordingState } from "@/hooks/useAudioRecorder";
import { MessageDialog } from "./MessageDialog";
import { Dialog } from "./Dialog";
import { Checkbox } from "./CustomCheckbox";
import { Button } from "./Button";
import { SpinnerLoader } from "./SpinnerLoader";
import { loginJatayu, fetchLanguageFromAPI, saveLanguageToAPI } from "@/store/api/jatayuApi";

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
}

export function VoiceDoctorNotesCard({
    notes = [
        "Doctor Notes Not Available!"
    ],
    onSaveNext,
    className = "",
    onAudioBlobChange,
    appointment,
    onTranscriptionComplete,
}: VoiceDoctorNotesCardProps) {
    const {
        recordingState,
        duration,
        audioUrl,
        audioBlob,
        permissionStatus,
        errorMessage,
        transcript,
        isProcessing,
        aiSummary,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        deleteRecording,
        reRecord,
        retryPermissions,
    } = useAudioRecorder();

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
            const success = await saveLanguageToAPI(tempSelectedLanguage);
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

    // Bubble up audio blob and duration changes to the parent
    useEffect(() => {
        onAudioBlobChange?.(audioBlob, displayDuration);
    }, [audioBlob, displayDuration, onAudioBlobChange]);

    // Trigger onTranscriptionComplete when streaming finalizes
    useEffect(() => {
        if (recordingState === RecordingState.STOPPED && !isProcessing && aiSummary) {
            onTranscriptionComplete?.(aiSummary, transcript);
        }
    }, [recordingState, isProcessing, aiSummary, transcript, onTranscriptionComplete]);

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

    return (
        <div className={`relative rounded-[20px] border border-[#E3EEE1] bg-white p-6 shadow-[0px_20px_40px_rgba(34,56,43,0.08)] flex flex-col gap-6 ${className}`}>

            {/* Language Settings Button */}
            {/* <div className="absolute top-6 right-6">
                <button
                    type="button"
                    onClick={() => setIsLanguageModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold shadow-sm transition-all"
                >
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Language Options
                </button>
            </div> */}

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

                {/* 1. Permission Denied State */}
                {permissionStatus === "denied" && (
                    <div className="flex flex-col items-center gap-4 bg-[#FFF5F5] border border-[#FEE2E2] p-5 rounded-[20px] text-center w-full max-w-lg transition-all">
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

                        <button
                            onClick={retryPermissions}
                            className="px-5 py-2.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 active:scale-98 transition-all shadow-sm"
                        >
                            Retry & Check Permission
                        </button>
                    </div>
                )}

                {/* 2. Unsupported Browser State */}
                {permissionStatus === "unsupported" && (
                    <div className="flex flex-col items-center gap-3 bg-[#FFF5F5] border border-[#FEE2E2] p-5 rounded-[20px] text-center w-full max-w-md">
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
                )}

                {/* 3. Idle / Initial State */}
                {recordingState === RecordingState.IDLE && permissionStatus !== "denied" && permissionStatus !== "unsupported" && (
                    <div className="flex flex-col items-center gap-3 transition-all">
                        <button
                            onClick={() => startRecording(appointment, selectedLanguage)}
                            className="flex cursor-pointer items-center gap-3 bg-[#0B8C00] text-white px-7 py-3 rounded-[32px] font-semibold text-sm hover:bg-[#097300] hover:shadow-lg active:scale-95 transition-all"
                        >
                            <span className="w-3.5 h-3.5 rounded-full bg-white relative flex items-center justify-center shadow-sm">
                                <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                <span className="absolute w-2 h-2 rounded-full bg-red-500" />
                            </span>
                            Start Recording
                        </button>
                        <span className="text-xs text-gray-400 font-medium">Click to request microphone access and start recording</span>
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
                    <div className="flex flex-col items-center gap-3 bg-[#F6FAF6] border border-[#E3EEE1] p-6 rounded-2xl text-center w-full max-w-lg shadow-sm transition-all">
                        <SpinnerLoader size={32} />
                        <div className="space-y-1">
                            <h4 className="font-semibold text-gray-800 text-sm">Processing Audio Stream</h4>
                            <p className="text-xs text-gray-500">Retrieving final clinical summary and transcribing...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Doctor's Notes Section */}
            <div className="space-y-4">
                <div
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
                </div>

                {!isNotesCollapsed && (
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
                )}
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
        </div>
    );
}
