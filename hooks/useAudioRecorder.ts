"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export enum RecordingState {
    IDLE = "IDLE",
    REQUESTING_PERMISSION = "REQUESTING_PERMISSION",
    RECORDING = "RECORDING",
    PAUSED = "PAUSED",
    STOPPED = "STOPPED",
    ERROR = "ERROR",
}

export type PermissionStatus = "prompt" | "granted" | "denied" | "unsupported" | "checking";

export function useAudioRecorder() {
    const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("checking");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Check browser compatibility on mount
    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkCompatibility = async () => {
            const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            const hasMediaRecorder = !!window.MediaRecorder;
            const isSecure = window.isSecureContext;

            if (!hasMediaDevices || !hasMediaRecorder || !isSecure) {
                setPermissionStatus("unsupported");
                setErrorMessage("Audio recording is not supported in this browser.");
                setRecordingState(RecordingState.ERROR);
                return;
            }

            try {
                // If the permission query API is supported, check current status
                if (navigator.permissions && navigator.permissions.query) {
                    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
                    setPermissionStatus(result.state as PermissionStatus);
                    
                    result.onchange = () => {
                        setPermissionStatus(result.state as PermissionStatus);
                        if (result.state === "denied") {
                            setErrorMessage("Microphone permission denied.");
                            setRecordingState(RecordingState.ERROR);
                        } else if (result.state === "granted" && recordingState === RecordingState.ERROR) {
                            setErrorMessage(null);
                            setRecordingState(RecordingState.IDLE);
                        }
                    };
                } else {
                    setPermissionStatus("prompt");
                }
            } catch (err) {
                // Query might fail in some browsers (e.g. Safari), default to prompt
                setPermissionStatus("prompt");
            }
        };

        checkCompatibility();
    }, [recordingState]);

    // Prevent accidental reload/refresh when recording or paused
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) {
                e.preventDefault();
                e.returnValue = "You have an active recording. Are you sure you want to leave?";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [recordingState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    // Request permissions and start recording
    const startRecording = useCallback(async () => {
        if (permissionStatus === "unsupported") return;

        setErrorMessage(null);
        setRecordingState(RecordingState.REQUESTING_PERMISSION);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setPermissionStatus("granted");

            // Setup MediaRecorder
            const options = { mimeType: "" };
            // Select browser-compatible MIME type
            const types = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/aac"];
            for (const type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    options.mimeType = type;
                    break;
                }
            }

            const mediaRecorder = new MediaRecorder(stream, options.mimeType ? options : undefined);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: mediaRecorder.mimeType || "audio/webm",
                });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                setRecordingState(RecordingState.STOPPED);
            };

            // Start recording
            mediaRecorder.start(250);
            setRecordingState(RecordingState.RECORDING);
            setDuration(0);

            // Timer
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (err: any) {
            console.error("Recording error:", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setPermissionStatus("denied");
                setErrorMessage("Microphone permission denied.");
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setErrorMessage("No microphone detected.");
            } else {
                setErrorMessage("Unable to start recording.");
            }
            setRecordingState(RecordingState.ERROR);
        }
    }, [permissionStatus]);

    const pauseRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === "recording") {
            recorder.pause();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setRecordingState(RecordingState.PAUSED);
        }
    }, []);

    const resumeRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === "paused") {
            recorder.resume();
            setRecordingState(RecordingState.RECORDING);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        }
    }, []);

    const stopRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        const stream = streamRef.current;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (recorder && (recorder.state === "recording" || recorder.state === "paused")) {
            recorder.stop();
        }

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const deleteRecording = useCallback(() => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setAudioBlob(null);
        setDuration(0);
        setRecordingState(RecordingState.IDLE);
        setErrorMessage(null);
    }, [audioUrl]);

    const reRecord = useCallback(() => {
        deleteRecording();
        startRecording();
    }, [deleteRecording, startRecording]);

    const retryPermissions = useCallback(async () => {
        setErrorMessage(null);
        setPermissionStatus("checking");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            setPermissionStatus("granted");
            setRecordingState(RecordingState.IDLE);
        } catch (err: any) {
            console.error("Retry permission error:", err);
            setPermissionStatus("denied");
            setErrorMessage("Microphone access is blocked.");
            setRecordingState(RecordingState.ERROR);
        }
    }, []);

    return {
        recordingState,
        duration,
        audioUrl,
        audioBlob,
        permissionStatus,
        errorMessage,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        deleteRecording,
        reRecord,
        retryPermissions,
    };
}
