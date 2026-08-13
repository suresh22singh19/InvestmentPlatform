"use client";

// Resilient audio chunk recorder hook with IndexedDB support
import { useState, useEffect, useRef, useCallback } from "react";
import { uploadAudioChunk, endAudioStream, combineAudioChunks, EndStreamRequest, refreshJatayuToken } from "@/store/api/jatayuApi";
import { useAppSelector } from "@/store/hooks";
import { selectUserEmail, selectUserId } from "@/store/slices/authSlice";

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

export interface OfflineChunk {
    chunkNumber: number;
    chunkId: string;
    name: string;
    language: string;
    audioBlob: Blob;
    uploaded: boolean;
}

const getTodayVersion = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return parseInt(`${yyyy}${mm}${dd}`, 10);
};

export function openDatabase(userId: string | number | undefined): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
            reject(new Error("IndexedDB is not supported"));
            return;
        }
        const todayInt = getTodayVersion();
        const userIdStr = userId ? String(userId) : "guest";
        const dbName = `voice_ai_db_${userIdStr}`;
        const request = indexedDB.open(dbName, todayInt);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains("chunks")) {
                db.deleteObjectStore("chunks");
            }
            if (db.objectStoreNames.contains("metadata")) {
                db.deleteObjectStore("metadata");
            }
            db.createObjectStore("chunks", { keyPath: "chunkNumber" });
            db.createObjectStore("metadata", { keyPath: "key" });
        };

        request.onsuccess = (event: any) => {
            const db = event.target.result;
            try {
                const transaction = db.transaction(["metadata", "chunks"], "readwrite");
                const metadataStore = transaction.objectStore("metadata");
                const chunksStore = transaction.objectStore("chunks");
                const todayStr = new Date().toDateString();

                const dateReq = metadataStore.get("last_active_date");
                dateReq.onsuccess = () => {
                    if (dateReq.result && dateReq.result.value !== todayStr) {
                        chunksStore.clear();
                    }
                    metadataStore.put({ key: "last_active_date", value: todayStr });
                };
            } catch (err) {
                console.error("Error verifying IndexedDB metadata:", err);
            }
            resolve(db);
        };

        request.onerror = (event: any) => {
            reject(event.target.error);
        };
    });
}

export function saveChunkToDB(db: IDBDatabase, chunk: OfflineChunk): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("chunks", "readwrite");
        const store = transaction.objectStore("chunks");
        const request = store.put(chunk);
        request.onsuccess = () => resolve();
        request.onerror = (event: any) => reject(event.target.error);
    });
}

export function getPendingChunksFromDB(db: IDBDatabase): Promise<OfflineChunk[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("chunks", "readonly");
        const store = transaction.objectStore("chunks");
        const request = store.getAll();
        request.onsuccess = () => {
            const allChunks: OfflineChunk[] = request.result || [];
            const pending = allChunks.filter(c => !c.uploaded).sort((a, b) => a.chunkNumber - b.chunkNumber);
            resolve(pending);
        };
        request.onerror = (event: any) => reject(event.target.error);
    });
}

export function markChunkAsUploadedInDB(db: IDBDatabase, chunkNumber: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("chunks", "readwrite");
        const store = transaction.objectStore("chunks");
        const getReq = store.get(chunkNumber);
        getReq.onsuccess = () => {
            const chunk = getReq.result;
            if (chunk) {
                chunk.uploaded = true;
                const updateReq = store.put(chunk);
                updateReq.onsuccess = () => resolve();
                updateReq.onerror = (event: any) => reject(event.target.error);
            } else {
                resolve();
            }
        };
        getReq.onerror = (event: any) => reject(event.target.error);
    });
}

export function clearAllChunksFromDB(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("chunks", "readwrite");
        const store = transaction.objectStore("chunks");
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event: any) => reject(event.target.error);
    });
}

export function useAudioRecorder() {
    const userEmail = useAppSelector(selectUserEmail);
    const userId = useAppSelector(selectUserId);
    const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("checking");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [transcript, setTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [offlineProcessing, setOfflineProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState<string | null>(null);
    const [aiSummary, setAiSummary] = useState<any>(null);
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    // Audio Devices State
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

    const refreshDevices = useCallback(async () => {
        if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter((device) => device.kind === "audioinput");

            // Filter out virtual OS endpoints ('default' and 'communications') created by Windows/Chrome
            const physicalDevices = audioInputs.filter(
                (d) => d.deviceId !== "default" && d.deviceId !== "communications"
            );

            const sourceList = physicalDevices.length > 0 ? physicalDevices : audioInputs;

            // Filter out generic empty labels if at least one device has a real label
            const hasRealLabels = sourceList.some((dev) => !!dev.label && dev.label.trim() !== "");
            const validDevices = hasRealLabels
                ? sourceList.filter((dev) => !!dev.label && dev.label.trim() !== "")
                : sourceList;

            // Deduplicate entries with matching normalized labels
            const uniqueDevices: MediaDeviceInfo[] = [];
            const seenLabels = new Set<string>();

            for (const dev of validDevices) {
                const normalizedLabel = (dev.label || `Microphone`)
                    .replace(/^(Default|Communications)\s*-\s*/i, "")
                    .trim();

                if (!seenLabels.has(normalizedLabel)) {
                    seenLabels.add(normalizedLabel);
                    uniqueDevices.push(dev);
                }
            }

            setAudioDevices(uniqueDevices);
            setSelectedDeviceId((prev) => {
                if (prev && uniqueDevices.some((d) => d.deviceId === prev)) return prev;
                return uniqueDevices.length > 0 ? uniqueDevices[0].deviceId : "";
            });
            return uniqueDevices;
        } catch (e) {
            console.error("Error enumerating audio devices:", e);
            return [];
        }
    }, []);

    const cancelRecordingDueToError = useCallback((reason: string) => {
        // 1. Instantly abort all active API network requests (upload-and-transcribe, end-stream, upload-combined-audio)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // 2. Stop stream tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.onended = null;
                track.onmute = null;
                track.stop();
            });
            streamRef.current = null;
        }

        // 3. Disconnect processor node
        if (processorNodeRef.current) {
            try {
                processorNodeRef.current.disconnect();
            } catch (e) { }
            processorNodeRef.current = null;
        }

        // 4. Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }

        // 5. Clear recording timers
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // 6. Clear patient data from IndexedDB
        openDatabase(userId).then(async (db) => {
            await clearAllChunksFromDB(db);
            console.log("Patient IndexedDB chunks wiped cleanly due to microphone permission error");
        }).catch((err) => {
            console.error("Error clearing IndexedDB chunks on mic permission error:", err);
        });

        // 7. Clear all buffers, transcript, and upload queues
        audioDataRef.current = [];
        chunkDataRef.current = [];
        chunkCounterRef.current = 0;
        completeTranscriptRef.current = "";
        chunkUploadQueueRef.current = Promise.resolve();

        isRecordingRef.current = false;
        isPausedRef.current = false;

        setDuration(0);
        setIsProcessing(false);
        setOfflineProcessing(false);
        setProcessingMessage(null);
        setTranscript("");
        setAiSummary(null);

        // 8. Set error status and message
        setPermissionStatus("denied");
        setErrorMessage(reason);
        setRecordingState(RecordingState.ERROR);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !navigator.mediaDevices) return;

        const syncDevicesAndPermissions = async () => {
            // 1. Refresh devices list in real-time
            await refreshDevices();

            // 2. Query permission status in real-time
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const res = await navigator.permissions.query({ name: "microphone" as PermissionName });
                    const currentPermission = res.state as PermissionStatus;

                    setPermissionStatus(currentPermission);

                    if (currentPermission === "denied") {
                        if (isRecordingRef.current) {
                            cancelRecordingDueToError("Microphone access was revoked during recording. The current recording has been cancelled.");
                        } else {
                            setErrorMessage("Microphone permission denied. Please allow microphone access in browser settings.");
                            setRecordingState(RecordingState.ERROR);
                        }
                    } else if (currentPermission === "granted" || currentPermission === "prompt") {
                        if (recordingState === RecordingState.ERROR && errorMessage?.includes("permission")) {
                            setErrorMessage(null);
                            setRecordingState(RecordingState.IDLE);
                        }
                    }
                }
            } catch (err) {
                // Ignore permissions query errors
            }
        };

        // Run initial check
        syncDevicesAndPermissions();

        // Poll every 3 seconds (3000 ms) in real-time
        const intervalId = setInterval(() => {
            syncDevicesAndPermissions();
        }, 3000);

        const handleDeviceChange = () => {
            syncDevicesAndPermissions();
        };

        if (navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
        }

        return () => {
            clearInterval(intervalId);
            if (navigator.mediaDevices.removeEventListener) {
                navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
            }
        };
    }, [refreshDevices, recordingState, errorMessage, cancelRecordingDueToError]);

    // Audio Context & Stream Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Audio Data Buffers Refs
    const audioDataRef = useRef<Float32Array[]>([]); // Full recording buffer
    const chunkDataRef = useRef<Float32Array[]>([]); // Active 10-second chunk buffer
    const isRecordingRef = useRef<boolean>(false);
    const isPausedRef = useRef<boolean>(false);

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
    const abortControllerRef = useRef<AbortController | null>(null);

    const cleanupOnSessionExpired = useCallback(async () => {
        setIsSessionExpired(true);
        isRecordingRef.current = false;
        isPausedRef.current = false;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

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

        try {
            const db = await openDatabase(userId);
            if (db) {
                await clearAllChunksFromDB(db);
            }
        } catch (e) {
            console.error("Error clearing IndexedDB on session expire:", e);
        }

        setRecordingState(RecordingState.IDLE);
        setIsProcessing(false);
        setOfflineProcessing(false);
        setProcessingMessage(null);
    }, [userId]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleSessionExpired = () => {
            console.warn("Session expired event caught in useAudioRecorder");
            cleanupOnSessionExpired();
        };

        window.addEventListener("jatayu:session_expired", handleSessionExpired);
        return () => {
            window.removeEventListener("jatayu:session_expired", handleSessionExpired);
        };
    }, [cleanupOnSessionExpired]);

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
                        const newState = result.state as PermissionStatus;
                        setPermissionStatus(newState);

                        if (newState === "denied") {
                            setErrorMessage("Microphone permission denied. Please allow microphone access in browser settings.");
                        } else if (newState === "granted") {
                            if (recordingState === RecordingState.ERROR) {
                                setErrorMessage(null);
                                setRecordingState(RecordingState.IDLE);
                            }
                        } else if (newState === "prompt") {
                            if (recordingState === RecordingState.ERROR) {
                                setErrorMessage(null);
                                setRecordingState(RecordingState.IDLE);
                            }
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

    // Cleanup on unmount & mount clearing
    useEffect(() => {
        openDatabase(userId).then(async (db) => {
            await clearAllChunksFromDB(db);
            console.log("Stale IndexedDB chunks cleared successfully on mount");
        }).catch((err) => {
            console.error("Mount DB clear error:", err);
        });

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            openDatabase(userId).then(async (db) => {
                await clearAllChunksFromDB(db);
                console.log("IndexedDB chunks cleared successfully on unmount");
            }).catch((err) => {
                console.error("Unmount DB clear error:", err);
            });
        };
    }, [audioUrl, userId]);

    const enqueueChunkUpload = (
        samples: Float32Array[],
        chunkNumber: number,
        chunkId: string,
        name: string,
        lang: string,
        sampleRate: number,
        isFinal: boolean = false
    ) => {
        if (!samples.length) return;
        if (!isRecordingRef.current && !isFinal) return;

        // console.log(`Queueing chunk ${chunkNumber} for upload`);

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

            let shouldStoreOffline = !navigator.onLine;

            if (!shouldStoreOffline) {
                try {
                    // console.log(`Uploading chunk ${chunkNumber}`);
                    const result = await uploadAudioChunk(formData, abortControllerRef.current?.signal);
                    // console.log(`Chunk ${chunkNumber} uploaded successfully:`, result);

                    if (result?.transcript) {
                        const prev = completeTranscriptRef.current;
                        completeTranscriptRef.current = prev ? prev + " " + result.transcript : result.transcript;
                    }
                } catch (err: any) {
                    if (err instanceof DOMException && err.name === "AbortError") {
                        console.log("Chunk upload aborted");
                        return;
                    }
                    if (err?.message === "JATAYU_SESSION_EXPIRED" || err?.message?.includes("Session expired")) {
                        console.warn("Chunk upload failed with JATAYU_SESSION_EXPIRED");
                        cleanupOnSessionExpired();
                        return;
                    }
                    console.error(`Error uploading chunk ${chunkNumber}, caching to IndexedDB:`, err);
                    shouldStoreOffline = true;
                }
            }

            if (shouldStoreOffline) {
                try {
                    const db = await openDatabase(userId);
                    await saveChunkToDB(db, {
                        chunkNumber,
                        chunkId,
                        name,
                        language: lang,
                        audioBlob: wavBlob,
                        uploaded: false
                    });
                    console.log(`Saved offline/failed chunk ${chunkNumber} to IndexedDB successfully`);
                } catch (dbErr) {
                    console.error(`Failed to save offline/failed chunk ${chunkNumber} to IndexedDB:`, dbErr);
                }
            }
        });
    };

    // Request permissions and start recording
    const startRecording = useCallback(async (appointment: any, languageCode: string = "auto") => {
        if (permissionStatus === "unsupported") return null;

        // Pre-verify session via refreshtoken API before starting recording
        try {
            await refreshJatayuToken({ force: true });
        } catch (authErr: any) {
            console.error("Session verification failed before starting recording:", authErr);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("jatayu:initial_session_expired"));
            }
            cleanupOnSessionExpired();
            return null;
        }

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
        isRecordingRef.current = true;
        isPausedRef.current = false;

        // Reset or initialize AbortController
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

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

        // console.log(`Starting chunked recording session. Stream ID: ${chunkId}, Name: ${recordingName}`);

        try {
            // 1. Pre-refresh devices before requesting stream
            const initialDevices = await refreshDevices();
            let targetDeviceId = selectedDeviceId;
            const targetDeviceObj = initialDevices.find((d) => d.deviceId === targetDeviceId);
            const targetLabel = targetDeviceObj?.label || "";

            let stream: MediaStream;

            // 2. Request stream using selected device constraint
            if (targetDeviceId && targetDeviceId !== "default" && targetDeviceId !== "communications") {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: targetDeviceId } }
                    });
                } catch (exactErr: any) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            audio: { deviceId: targetDeviceId }
                        });
                    } catch (idealErr: any) {
                        console.warn("Target device constraint failed, requesting default audio stream:", idealErr);
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    }
                }
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            // 3. Post-permission verification & cross-check
            // Re-enumerate devices now that permission is fully granted
            const postPermissionDevices = await refreshDevices();

            const activeTrack = stream.getAudioTracks()[0];
            const activeSettings = activeTrack ? activeTrack.getSettings() : {};
            const activeDeviceId = activeSettings.deviceId;

            // 4. Cross-verify if active microphone matches user's selection
            let desiredDevice = postPermissionDevices.find((d) => d.deviceId === targetDeviceId);
            if (!desiredDevice && targetLabel) {
                desiredDevice = postPermissionDevices.find((d) => d.label && d.label === targetLabel);
            }

            if (desiredDevice && desiredDevice.deviceId && activeDeviceId !== desiredDevice.deviceId) {
                try {
                    console.log(`Switching audio stream to exact user-selected microphone: ${desiredDevice.label} (${desiredDevice.deviceId})`);
                    const exactStream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: desiredDevice.deviceId } }
                    });
                    activeTrack.stop(); // Stop the fallback default stream
                    stream = exactStream;
                    setSelectedDeviceId(desiredDevice.deviceId);
                } catch (switchErr) {
                    console.warn("Could not switch stream to exact selected device:", switchErr);
                }
            }

            streamRef.current = stream;

            stream.getAudioTracks().forEach((track) => {
                track.onended = () => {
                    if (isRecordingRef.current) {
                        cancelRecordingDueToError("Microphone access was disconnected or revoked. The current recording has been cancelled.");
                    }
                };
                track.onmute = () => {
                    if (isRecordingRef.current) {
                        cancelRecordingDueToError("Microphone access was muted or revoked. The current recording has been cancelled.");
                    }
                };
            });

            setPermissionStatus("granted");
            refreshDevices();

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
                if (!isRecordingRef.current) return;
                if (isPausedRef.current) return;

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

            return chunkId;
        } catch (err: any) {
            console.error("Microphone access error:", err);
            let msg = "Unable to start recording.";
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setPermissionStatus("denied");
                msg = "Microphone permission denied. Please allow microphone access in browser settings.";
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                msg = "No microphone device detected on your system. Please connect a microphone and try again.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                msg = "Microphone device is currently in use by another application or hardware error occurred.";
            } else if (err.name === "OverconstrainedError") {
                msg = "Selected microphone device is not available. Please select another microphone.";
            } else {
                msg = err?.message || "Unable to access microphone device.";
            }
            setErrorMessage(msg);
            setRecordingState(RecordingState.ERROR);
            return null;
        }
    }, [permissionStatus, recordingState, selectedDeviceId, refreshDevices]);

    const pauseRecording = useCallback(() => {
        if (recordingState === RecordingState.RECORDING) {
            setRecordingState(RecordingState.PAUSED);
            isPausedRef.current = true;
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [recordingState]);

    const resumeRecording = useCallback(() => {
        if (recordingState === RecordingState.PAUSED) {
            setRecordingState(RecordingState.RECORDING);
            isPausedRef.current = false;
            chunkStartTimeRef.current = Date.now(); // Reset chunk boundary
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        }
    }, [recordingState]);

    const stopRecording = useCallback(async () => {
        isRecordingRef.current = false;
        isPausedRef.current = false;
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
            await audioContextRef.current.close().catch(() => { });
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
                sampleRateRef.current,
                true // isFinal
            );
        }

        try {
            // Wait for all chunks to upload
            await chunkUploadQueueRef.current;

            let dbInstance: IDBDatabase | null = null;
            try {
                dbInstance = await openDatabase(userId);
            } catch (dbErr) {
                console.error("Failed to open IndexedDB in stopRecording:", dbErr);
            }

            if (dbInstance) {
                let pending = await getPendingChunksFromDB(dbInstance);
                if (pending.length > 0) {
                    setOfflineProcessing(true);
                    while (pending.length > 0) {
                        if (!navigator.onLine) {
                            setProcessingMessage("Waiting for internet connection to restore pending chunks...");
                            await new Promise<void>((resolve) => {
                                const onOnline = () => {
                                    window.removeEventListener("online", onOnline);
                                    resolve();
                                };
                                window.addEventListener("online", onOnline);
                            });
                        }

                        setProcessingMessage("Uploading offline recorded audio..");
                        const chunkToUpload = pending[0];
                        const formData = new FormData();
                        formData.append("file", chunkToUpload.audioBlob, `chunk-${chunkToUpload.chunkNumber}.wav`);
                        formData.append("chunk_id", chunkToUpload.chunkId);
                        formData.append("chunk_number", chunkToUpload.chunkNumber.toString());
                        formData.append("name", chunkToUpload.name);
                        formData.append("language", chunkToUpload.language);

                        try {
                            const result = await uploadAudioChunk(formData, abortControllerRef.current?.signal);
                            if (result?.transcript) {
                                const prev = completeTranscriptRef.current;
                                completeTranscriptRef.current = prev ? prev + " " + result.transcript : result.transcript;
                            }
                            await markChunkAsUploadedInDB(dbInstance, chunkToUpload.chunkNumber);
                            pending = await getPendingChunksFromDB(dbInstance);
                        } catch (uploadErr: any) {
                            if (uploadErr instanceof DOMException && uploadErr.name === "AbortError") {
                                console.log("Stored chunk upload aborted");
                                return;
                            }
                            if (uploadErr?.message === "JATAYU_SESSION_EXPIRED" || uploadErr?.message?.includes("Session expired")) {
                                console.warn("Stored chunk upload failed with JATAYU_SESSION_EXPIRED");
                                cleanupOnSessionExpired();
                                return;
                            }
                            console.error(`Error uploading stored chunk ${chunkToUpload.chunkNumber}:`, uploadErr);
                            // Short delay before retrying
                            await new Promise(r => setTimeout(r, 3000));
                        }
                    }
                }
            }

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

            setProcessingMessage("Retrieving final clinical summary and transcribing...");
            let endStreamSuccess = false;
            while (!endStreamSuccess) {
                if (!navigator.onLine) {
                    setOfflineProcessing(true);
                    setProcessingMessage("Offline. Waiting for internet connection to complete final summary...");
                    await new Promise<void>((resolve) => {
                        const onOnline = () => {
                            window.removeEventListener("online", onOnline);
                            resolve();
                        };
                        window.addEventListener("online", onOnline);
                    });
                }

                try {
                    setProcessingMessage("Retrieving final clinical summary and transcribing...");
                    const endStreamResult = await endAudioStream(payload, abortControllerRef.current?.signal);
                    endStreamSuccess = true;

                    if (endStreamResult?.summary) {
                        setAiSummary(endStreamResult.summary);
                    }

                    if (endStreamResult?.transcript) {
                        setTranscript(endStreamResult.transcript);
                        completeTranscriptRef.current = endStreamResult.transcript;
                    } else if (completeTranscriptRef.current) {
                        setTranscript(completeTranscriptRef.current);
                    }
                } catch (endErr: any) {
                    if (endErr instanceof DOMException && endErr.name === "AbortError") {
                        console.log("End stream aborted");
                        return;
                    }
                    if (endErr?.message === "JATAYU_SESSION_EXPIRED" || endErr?.message?.includes("Session expired")) {
                        console.warn("End stream failed with JATAYU_SESSION_EXPIRED");
                        cleanupOnSessionExpired();
                        return;
                    }
                    console.error("Error calling end-stream:", endErr);
                    setOfflineProcessing(true);
                    setProcessingMessage("Facing an API error or network issue. Retrying final summary once connection is restored...");
                    // Delay before retry
                    await new Promise(r => setTimeout(r, 4000));
                }
            }

            // Clear all chunks from database after successful final processing
            if (dbInstance) {
                await clearAllChunksFromDB(dbInstance);
            }

            // Combine audio chunks asynchronously (non-blocking)
            combineAudioChunks({
                chunk_id: chunkIdRef.current,
                name: nameRef.current,
                email: userEmail || "",
            }).catch((combineErr) => {
                if (combineErr?.message === "JATAYU_SESSION_EXPIRED" || combineErr?.message?.includes("Session expired")) {
                    cleanupOnSessionExpired();
                } else {
                    console.error("Combined audio upload failed:", combineErr);
                }
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
            if (err?.message === "JATAYU_SESSION_EXPIRED" || err?.message?.includes("Session expired")) {
                cleanupOnSessionExpired();
                return;
            }
            setErrorMessage("Facing an API error while processing the recorded voice. Please try again.");
            setRecordingState(RecordingState.ERROR);
        } finally {
            setIsProcessing(false);
            setOfflineProcessing(false);
            setProcessingMessage(null);
        }
    }, [userEmail, userId, cleanupOnSessionExpired]);

    const deleteRecording = useCallback(() => {
        isRecordingRef.current = false;
        isPausedRef.current = false;
        setRecordingState(RecordingState.IDLE);
        setDuration(0);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setAudioBlob(null);
        setTranscript("");
        setAiSummary(null);
        setIsProcessing(false);
        setOfflineProcessing(false);
        setProcessingMessage(null);
        setErrorMessage(null);
        audioDataRef.current = [];
        chunkDataRef.current = [];
        completeTranscriptRef.current = "";

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
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        openDatabase(userId).then(db => {
            clearAllChunksFromDB(db);
        }).catch(err => {
            console.error("Failed to clear DB on deleteRecording:", err);
        });

    }, [audioUrl, userId]);

    const reRecord = useCallback(() => {
        deleteRecording();
    }, [deleteRecording]);
    const resetError = useCallback(() => {
        setErrorMessage(null);
        if (recordingState === RecordingState.ERROR) {
            setRecordingState(RecordingState.IDLE);
        }
    }, [recordingState]);

    const retryPermissions = useCallback(async () => {
        setPermissionStatus("checking");
        setErrorMessage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            setPermissionStatus("granted");
            setRecordingState(RecordingState.IDLE);
            await refreshDevices();
        } catch (err: any) {
            console.error("Permission retry error:", err);
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setPermissionStatus("denied");
                setErrorMessage("Microphone access is blocked.");
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setErrorMessage("No microphone device detected on your system. Please connect a microphone and try again.");
            } else {
                setErrorMessage(err?.message || "Unable to access microphone.");
            }
            setRecordingState(RecordingState.ERROR);
        }
    }, [refreshDevices]);

    return {
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
        chunkId: chunkIdRef.current,
        isSessionExpired,
        audioDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        refreshDevices,
        resetError,
        cleanupOnSessionExpired,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        deleteRecording,
        reRecord,
        retryPermissions,
    };
}
