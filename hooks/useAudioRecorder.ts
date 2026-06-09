"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { uploadAudioChunk, endAudioStream, combineAudioChunks, EndStreamRequest } from "@/store/api/jatayuApi";

export enum RecordingState {
    IDLE = "IDLE",
    REQUESTING_PERMISSION = "REQUESTING_PERMISSION",
    RECORDING = "RECORDING",
    PAUSED = "PAUSED",
    STOPPED = "STOPPED",
    ERROR = "ERROR",
}

export type PermissionStatus = "prompt" | "granted" | "denied" | "unsupported" | "checking";

const CLINICAL_SUMMARY_FIELDS = [
    "Vitals",
    "Allergy",
    "Chief Complaints and HOPI",
    "Diagnosis",
    "Orders and Procedures",
    "Medication",
    "Advice and Instructions",
    "Referral",
    "Physical Examination",
    "Followup",
    "Family History",
    "Past History",
    "Medical Note",
    "Doctor Notes",
    "Plan of Care",
    "Lab Results",
    "Diet Advice",
    "Examination",
    "Personal History",
    "Confidential Notes",
    "Admission and Surgery Advice"
];

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
}

export function useAudioRecorder() {
    const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("checking");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [transcript, setTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiSummary, setAiSummary] = useState<any>(null);

    // Audio Context & Stream Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Audio Data Buffers Refs
    const audioDataRef = useRef<Float32Array[]>([]); // Full recording buffer
    const chunkDataRef = useRef<Float32Array[]>([]); // Active 10-second chunk buffer

    // Session-specific Refs
    const appointmentRef = useRef<any>(null);
    const chunkIdRef = useRef<string>("");
    const nameRef = useRef<string>("");
    const languageRef = useRef<string>("auto");
    const sampleRateRef = useRef<number>(16000);
    const chunkCounterRef = useRef<number>(0);
    const chunkStartTimeRef = useRef<number>(0);
    const completeTranscriptRef = useRef<string>("");

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunkUploadQueueRef = useRef<Promise<any>>(Promise.resolve());

    // Check browser compatibility on mount
    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkCompatibility = async () => {
            const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const isSecure = window.isSecureContext;

            if (!hasMediaDevices || !AudioContextClass || !isSecure) {
                setPermissionStatus("unsupported");
                setErrorMessage("Audio recording is not supported in this browser.");
                setRecordingState(RecordingState.ERROR);
                return;
            }

            try {
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

    const enqueueChunkUpload = (
        samples: Float32Array[],
        chunkNumber: number,
        chunkId: string,
        name: string,
        lang: string,
        sampleRate: number
    ) => {
        if (!samples.length) return;

        console.log(`Queueing chunk ${chunkNumber} for upload`);

        chunkUploadQueueRef.current = chunkUploadQueueRef.current.then(async () => {
            let totalLength = 0;
            for (let i = 0; i < samples.length; i++) {
                totalLength += samples[i].length;
            }

            const audioBuffer = new Float32Array(totalLength);
            let offset = 0;
            for (let i = 0; i < samples.length; i++) {
                audioBuffer.set(samples[i], offset);
                offset += samples[i].length;
            }

            const wavBlob = encodeWAV(audioBuffer, sampleRate);
            const formData = new FormData();
            formData.append("file", wavBlob, `chunk-${chunkNumber}.wav`);
            formData.append("chunk_id", chunkId);
            formData.append("chunk_number", chunkNumber.toString());
            formData.append("name", name);
            formData.append("language", lang);

            try {
                console.log(`Uploading chunk ${chunkNumber}`);
                const result = await uploadAudioChunk(formData);
                console.log(`Chunk ${chunkNumber} uploaded successfully:`, result);

                if (result?.transcript) {
                    setTranscript((prev) => {
                        const next = prev ? prev + " " + result.transcript : result.transcript;
                        completeTranscriptRef.current = next;
                        return next;
                    });
                }
            } catch (err) {
                console.error(`Error uploading chunk ${chunkNumber}:`, err);
            }
        });
    };

    // Request permissions and start recording
    const startRecording = useCallback(async (appointment: any, languageCode: string = "auto") => {
        if (permissionStatus === "unsupported") return;

        setErrorMessage(null);
        setTranscript("");
        setAiSummary(null);
        setIsProcessing(false);
        setRecordingState(RecordingState.REQUESTING_PERMISSION);
        appointmentRef.current = appointment;

        // Reset tracking buffers
        audioDataRef.current = [];
        chunkDataRef.current = [];
        chunkCounterRef.current = 0;
        completeTranscriptRef.current = "";
        chunkUploadQueueRef.current = Promise.resolve();

        // Map UI-selected language to backend language code
        let mappedLang = languageCode.trim().toLowerCase();
        if (mappedLang.includes("bengali")) mappedLang = "Bengali";
        else if (mappedLang.includes("kannada")) mappedLang = "Kannada";
        else if (mappedLang.includes("malayalam")) mappedLang = "Malayalam";
        else if (mappedLang.includes("telugu")) mappedLang = "Telugu";
        else if (mappedLang.includes("gujarati")) mappedLang = "Gujarati";
        else if (mappedLang.includes("marathi")) mappedLang = "Marathi";
        else if (mappedLang.includes("tamil")) mappedLang = "Tamil";
        else if (mappedLang.includes("hindi")) mappedLang = "Hindi";
        else if (mappedLang.includes("urdu")) mappedLang = "Urdu";
        else if (mappedLang.includes("english")) mappedLang = "English";
        else if (mappedLang.includes("arabic")) mappedLang = "Arabic";
        else if (mappedLang.includes("burmese")) mappedLang = "Burmese";
        else mappedLang = "auto";

        languageRef.current = mappedLang;

        // Generate identifiers
        const chunkId = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        chunkIdRef.current = chunkId;

        const patientIdentifier = appointment?.uhid || appointment?.registrationId || "0000";
        const identifier = `MR-${patientIdentifier}`;
        const currentDate = new Date();
        const formattedDate = currentDate
            .toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            })
            .replace(/[,]/g, "");
        const recordingName = `${identifier} ${formattedDate}`;
        nameRef.current = recordingName;

        console.log(`Starting chunked recording session. Stream ID: ${chunkId}, Name: ${recordingName}`);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setPermissionStatus("granted");

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContextClass();
            audioContextRef.current = context;
            sampleRateRef.current = context.sampleRate;

            if (context.state === "suspended") {
                await context.resume();
            }

            const source = context.createMediaStreamSource(stream);
            const processor = context.createScriptProcessor(4096, 1, 1);
            processorNodeRef.current = processor;

            source.connect(processor);
            processor.connect(context.destination);

            chunkStartTimeRef.current = Date.now();

            processor.onaudioprocess = (e) => {
                // Ignore if recording is not active
                if (recordingState === RecordingState.PAUSED) return;

                const inputBuffer = e.inputBuffer.getChannelData(0);
                const bufferCopy = new Float32Array(inputBuffer);
                audioDataRef.current.push(bufferCopy);
                chunkDataRef.current.push(bufferCopy);

                const currentTime = Date.now();
                const elapsedSeconds = (currentTime - chunkStartTimeRef.current) / 1000;

                if (elapsedSeconds >= 10) {
                    chunkStartTimeRef.current = currentTime;
                    const chunkSamples = [...chunkDataRef.current];
                    chunkDataRef.current = [];

                    if (chunkSamples.length > 0) {
                        chunkCounterRef.current++;
                        enqueueChunkUpload(
                            chunkSamples,
                            chunkCounterRef.current,
                            chunkIdRef.current,
                            nameRef.current,
                            languageRef.current,
                            sampleRateRef.current
                        );
                    }
                }
            };

            setRecordingState(RecordingState.RECORDING);
            setDuration(0);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } catch (err: any) {
            console.error("Microphone access error:", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setPermissionStatus("denied");
                setErrorMessage("Microphone permission denied.");
            } else {
                setErrorMessage("Unable to start recording.");
            }
            setRecordingState(RecordingState.ERROR);
        }
    }, [permissionStatus, recordingState]);

    const pauseRecording = useCallback(() => {
        if (recordingState === RecordingState.RECORDING) {
            setRecordingState(RecordingState.PAUSED);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [recordingState]);

    const resumeRecording = useCallback(() => {
        if (recordingState === RecordingState.PAUSED) {
            setRecordingState(RecordingState.RECORDING);
            chunkStartTimeRef.current = Date.now(); // Reset chunk boundary
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        }
    }, [recordingState]);

    const stopRecording = useCallback(async () => {
        setRecordingState(RecordingState.STOPPED);
        setIsProcessing(true);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (processorNodeRef.current) {
            processorNodeRef.current.disconnect();
            processorNodeRef.current.onaudioprocess = null;
            processorNodeRef.current = null;
        }

        if (audioContextRef.current) {
            await audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        // Upload final remaining chunk if there are any samples
        if (chunkDataRef.current.length > 0) {
            const finalSamples = [...chunkDataRef.current];
            chunkDataRef.current = [];
            chunkCounterRef.current++;
            enqueueChunkUpload(
                finalSamples,
                chunkCounterRef.current,
                chunkIdRef.current,
                nameRef.current,
                languageRef.current,
                sampleRateRef.current
            );
        }

        try {
            // Wait for all chunks to upload
            await chunkUploadQueueRef.current;

            const app = appointmentRef.current;
            const patientParts = (app?.patientName || "").trim().split(/\s+/);
            const patientFirstName = patientParts[0] || "";
            const patientLastName = patientParts.slice(1).join(" ") || "";

            const doctorParts = (app?.doctorName || "").trim().split(/\s+/);
            const doctorFirstName = doctorParts[0] || "";
            const doctorLastName = doctorParts.slice(1).join(" ") || "";

            const contactParts = [
                app?.contactNumber ? `Contact: ${app.contactNumber}` : "",
                app?.city ? `City: ${app.city}` : "",
                app?.state ? `State: ${app.state}` : ""
            ].filter(Boolean).join(" • ");

            const fieldsObject = {
                metadata: {
                    visitId: app?.appointmentId?.toString() || "",
                    visitType: app?.visitType || "first",
                    timestamp: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
                    provider: {
                        doctorName: app?.doctorName || "",
                        doctorId: app?.doctorId?.toString() || ""
                    },
                    language: "en",
                    source: "VoiceDocAI",
                    version: "2.0",
                    transcriptKey: ""
                },
                patientInfo: {
                    appointmentId: Number(app?.appointmentId) || 0,
                    uhid: app?.uhid || "",
                    patientID: app?.uhid || "",
                    firstName: patientFirstName,
                    lastName: patientLastName,
                    gender: app?.gender || "",
                    age: Number(app?.age) || 0,
                    language: "en",
                    remarks: contactParts
                },
                doctorInfo: {
                    emailID: "doctor@hiims.in",
                    doctorID: app?.doctorId?.toString() || "",
                    firstName: doctorFirstName,
                    lastName: doctorLastName,
                    clinicName: "HIIMS",
                    clinicLocation: app?.branchName || "",
                    doctorSpecialization: "Naturopathy",
                    clinicPincode: "140507",
                    remarks: ""
                }
            };

            // Trigger endStream API to get AI summary
            const payload: EndStreamRequest = {
                name: nameRef.current,
                transcript: completeTranscriptRef.current,
                fields: [fieldsObject],
                source: "med",
                language: languageRef.current,
            };

            console.log("Ending stream on server...");
            const endStreamResult = await endAudioStream(payload);
            console.log("Stream ended successfully:", endStreamResult);

            if (endStreamResult?.summary) {
                setAiSummary(endStreamResult.summary);
            }

            // Combine audio chunks asynchronously (non-blocking)
            combineAudioChunks({
                chunk_id: chunkIdRef.current,
                name: nameRef.current,
                email: "jeena1sikho@gmail.com",
            }).catch((combineErr) => {
                console.error("Combined audio upload failed:", combineErr);
            });

            // Construct client-side combined WAV Blob for playback
            if (audioDataRef.current.length > 0) {
                let totalLength = 0;
                for (let i = 0; i < audioDataRef.current.length; i++) {
                    totalLength += audioDataRef.current[i].length;
                }

                const combinedBuffer = new Float32Array(totalLength);
                let offset = 0;
                for (let i = 0; i < audioDataRef.current.length; i++) {
                    combinedBuffer.set(audioDataRef.current[i], offset);
                    offset += audioDataRef.current[i].length;
                }

                const finalBlob = encodeWAV(combinedBuffer, sampleRateRef.current);
                const localUrl = URL.createObjectURL(finalBlob);
                setAudioBlob(finalBlob);
                setAudioUrl(localUrl);
            }
        } catch (err: any) {
            console.error("Error ending stream:", err);
            setErrorMessage(err.message || "Failed to finalize audio stream.");
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const deleteRecording = useCallback(() => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        setAudioBlob(null);
        setDuration(0);
        setTranscript("");
        setAiSummary(null);
        setIsProcessing(false);
        setRecordingState(RecordingState.IDLE);
        setErrorMessage(null);
    }, [audioUrl]);

    const reRecord = useCallback(() => {
        deleteRecording();
    }, [deleteRecording]);

    const retryPermissions = useCallback(async () => {
        setErrorMessage(null);
        setPermissionStatus("checking");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            setPermissionStatus("granted");
            setRecordingState(RecordingState.IDLE);
        } catch (err: any) {
            console.error("Permission retry error:", err);
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
    };
}
