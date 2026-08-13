export interface UploadReturnRequest {
    audio: number[]; // Float32Array serialized as a number array
    email: string;
    fields: any;
    name: string;
    source: string;
}

export interface UploadReturnResponse {
    summary: {
        chiefComplaints?: string;
        medicalHistory?: string;
        medicines?: string;
        [key: string]: any;
    } | string;
    transcript: string;
}
const BASE_URL = "https://advanced-core-api-pvrrcvbtkq-el.a.run.app"; // use this auido apis actions
const AUTH_BASE_URL = "https://jeenasikho-auth-pvrrcvbtkq-el.a.run.app"; // usse this for login 
const HELPER_BASE_URL = "https://jeenasikho-helper-service-pvrrcvbtkq-el.a.run.app";

function getUserEmail(): string {
    if (typeof window === "undefined") return "";
    try {
        const userRaw = localStorage.getItem("user");
        if (userRaw) {
            const user = JSON.parse(userRaw);
            if (user && user.email) {
                return user.email;
            }
        }
    } catch (e) {
        console.error("Failed to parse user from localStorage", e);
    }
    return "";
}

let activeRefreshPromise: Promise<string> | null = null;
let refreshTimeoutId: any = null;
let activeLanguageFetchPromise: Promise<string> | null = null;
let activeSessionRegisterPromise: Promise<string | null> | null = null;

let isSessionRegistered = false;
let registeredToken = "";
let registeredSessionId = "";

function getJwtExpiration(token: string): number | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        let payloadString = parts[1];
        payloadString = payloadString.replace(/-/g, "+").replace(/_/g, "/");
        while (payloadString.length % 4) {
            payloadString += "=";
        }

        let decoded = "";
        if (typeof window !== "undefined") {
            decoded = window.atob(payloadString);
        } else {
            decoded = Buffer.from(payloadString, "base64").toString("utf-8");
        }

        const payload = JSON.parse(decoded);
        if (payload && typeof payload.exp === "number") {
            return payload.exp;
        }
    } catch (e) {
        console.error("Failed to decode JWT token expiration", e);
    }
    return null;
}

function scheduleTokenRefresh(expiresInSeconds: number) {
    if (typeof window === "undefined") return;

    if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
    }

    // Refresh 5 minutes before expiration, or after 75% of lifetime if short
    const refreshBuffer = Math.min(300, expiresInSeconds * 0.25);
    const delayMs = Math.max(0, (expiresInSeconds - refreshBuffer) * 1000);

    // console.log(`Scheduling proactive token refresh in ${delayMs / 1000} seconds (${Math.round(delayMs / 60000)} minutes)`);

    refreshTimeoutId = setTimeout(async () => {
        try {
            console.log("Proactively refreshing token before expiration...");
            await refreshJatayuToken();
        } catch (err) {
            console.error("Proactive token refresh failed:", err);
            // Retry in 1 minute
            scheduleTokenRefresh(60);
        }
    }, delayMs);
}

// Initial scheduling when module is loaded in the browser
if (typeof window !== "undefined") {
    setTimeout(() => {
        const token = localStorage.getItem("jatayuToken");
        if (token) {
            const exp = getJwtExpiration(token);
            if (exp) {
                const nowSeconds = Math.floor(Date.now() / 1000);
                const timeRemaining = exp - nowSeconds;
                if (timeRemaining > 0) {
                    scheduleTokenRefresh(timeRemaining);
                } else {
                    console.log("Stored token is already expired. Refreshing immediately...");
                    refreshJatayuToken({ silent: true }).catch(err => console.error("Initial token refresh failed:", err));
                }
            }
        }
    }, 1000);
}

export async function forceLogoutJatayu(email: string | null): Promise<void> {
    const tempToken = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : null;
    try {
        await fetch(`${AUTH_BASE_URL}/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(tempToken ? { "Authorization": `Bearer ${tempToken}` } : {})
            },
            body: JSON.stringify({
                emailid: email || ""
            })
        });
    } catch (logoutErr) {
        console.error("Force logout Jatayu failed:", logoutErr);
    }
}

export async function loginJatayu(allowAutoLogout: boolean = true): Promise<{ token: string;[key: string]: any }> {
    console.warn("loginJatayu is deprecated. Login is now handled through the unified HIIMS login flow.");
    const token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : null;
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("jatayuRefreshToken") : null;
    if (token) {
        return { token, refreshtoken: refreshToken, refreshToken };
    }
    throw new Error("Jatayu session not found. Please log in through HIIMS.");
}

export function dispatchJatayuSessionExpired(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem("jatayuToken");
        localStorage.removeItem("jatayuRefreshToken");
        localStorage.removeItem("jatayuSessionId");
        localStorage.setItem("ai_voice_recording_active", "false");
        localStorage.removeItem("ai_voice_recording_session_id");

        window.dispatchEvent(new CustomEvent("jatayu:session_expired"));
    }
}

export async function refreshJatayuToken(options: { silent?: boolean; force?: boolean } = {}): Promise<string> {
    if (!options.force && typeof window !== "undefined") {
        const currentToken = localStorage.getItem("jatayuToken");
        if (currentToken) {
            const exp = getJwtExpiration(currentToken);
            if (exp) {
                const nowSeconds = Math.floor(Date.now() / 1000);
                if (exp - nowSeconds > 30) {
                    return currentToken;
                }
            }
        }
    }

    if (activeRefreshPromise) {
        return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
        try {
            const refreshToken = typeof window !== "undefined" ? localStorage.getItem("jatayuRefreshToken") : null;
            if (!refreshToken) {
                console.warn("No refresh token found, throwing JATAYU_SESSION_EXPIRED");
                if (!options.silent) {
                    dispatchJatayuSessionExpired();
                }
                throw new Error("JATAYU_SESSION_EXPIRED");
            }

            const response = await fetch(`${AUTH_BASE_URL}/refreshtoken`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    refreshtoken: refreshToken
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                console.error(`Token refresh failed with status ${response.status}: ${errorText}`);
                if (!options.silent) {
                    dispatchJatayuSessionExpired();
                }
                throw new Error("JATAYU_SESSION_EXPIRED");
            }

            let data = await response.json();
            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error("Failed to parse double-stringified refresh response", e);
                }
            }

            const token = data.token;
            const newRefreshToken = data.refreshtoken || data.refreshToken;

            if (token) {
                if (typeof window !== "undefined") {
                    localStorage.setItem("jatayuToken", token);
                    if (newRefreshToken) {
                        localStorage.setItem("jatayuRefreshToken", newRefreshToken);
                    }
                }

                // Schedule token refresh
                scheduleTokenRefresh(data.expiresIn ? Number(data.expiresIn) : 3600);

                // Register session after token refresh
                await ensureAndRegisterSession(token).catch(err => {
                    console.error("Failed to register session during refresh:", err);
                });
            }

            return token;
        } finally {
            activeRefreshPromise = null;
        }
    })();

    return activeRefreshPromise;
}

export async function logoutJatayu(): Promise<void> {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("jatayuToken");

    // Clear active refresh timeout
    if (refreshTimeoutId) {
        clearTimeout(refreshTimeoutId);
        refreshTimeoutId = null;
    }

    // Clear localStorage first so local state is cleaned up regardless of api result
    localStorage.removeItem("jatayuToken");
    localStorage.removeItem("jatayuRefreshToken");
    localStorage.removeItem("jatayuSessionId");

    // Reset memory state
    isSessionRegistered = false;
    registeredToken = "";
    registeredSessionId = "";

    if (!token) return;

    try {
        const response = await fetch(`${AUTH_BASE_URL}/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                emailid: getUserEmail()
            })
        });

        if (!response.ok) {
            console.warn(`Jatayu Logout API returned status ${response.status}`);
        }
    } catch (error) {
        console.error("Jatayu Logout API error:", error);
    }
}

export async function uploadAudioReturn(payload: UploadReturnRequest): Promise<UploadReturnResponse> {
    const token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : null;
    const activeToken = token;
    let response = await fetch(`${BASE_URL}/api/upload-and-transcribe`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
    });

    if (response.status === 401) {
        console.warn("Jatayu token expired, attempting token refresh...");
        try {
            const freshToken = await refreshJatayuToken();
            response = await fetch(`${BASE_URL}/api/upload-and-transcribe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${freshToken}`
                },
                body: JSON.stringify(payload)
            });
        } catch (refreshErr) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 401 || errorText.includes("Session expired") || errorText.includes("log in again")) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
        throw new Error(errorText || `API request failed with status ${response.status}`);
    }

    return response.json();
}

async function ensureAndRegisterSession(token: string): Promise<string | null> {
    let session_id = typeof window !== "undefined" ? localStorage.getItem("jatayuSessionId") : "";
    if (!session_id) {
        const email = getUserEmail() || "jeena1sikho@gmail.com";
        const curTime = new Date()
            .toLocaleTimeString()
            .replace(" ", "-")
            .replace(/:/g, "-");
        const curDate = new Date().toLocaleDateString().replace(/\//g, "-");
        const rawSessionIdString = `${email}${curDate}${curTime}`;
        if (typeof window !== "undefined") {
            session_id = window.btoa(rawSessionIdString);
        } else {
            session_id = Buffer.from(rawSessionIdString).toString("base64");
        }
    }

    // If session is already registered successfully for this token and session ID, return it
    if (isSessionRegistered && token === registeredToken && session_id === registeredSessionId) {
        return session_id;
    }

    if (activeSessionRegisterPromise) {
        return activeSessionRegisterPromise;
    }

    activeSessionRegisterPromise = (async () => {
        try {
            // console.log("Registering session ID:", session_id);
            const sessionResponse = await fetch(
                `${HELPER_BASE_URL}/registerSession`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ session_id }),
                }
            );

            if (!sessionResponse.ok) {
                console.warn(`Jatayu registerSession API returned status ${sessionResponse.status}`);
                return null;
            } else {
                const regData = await sessionResponse.json();
                // console.log("Jatayu registerSession success:", regData);
                if (typeof window !== "undefined") {
                    localStorage.setItem("jatayuSessionId", session_id);
                }
                isSessionRegistered = true;
                registeredToken = token;
                registeredSessionId = session_id;
                return session_id;
            }
        } catch (sessionErr) {
            console.error("Failed to register session:", sessionErr);
            return null;
        }
    })();

    try {
        return await activeSessionRegisterPromise;
    } finally {
        activeSessionRegisterPromise = null;
    }
}

export async function fetchLanguageFromAPI(): Promise<string> {
    if (activeLanguageFetchPromise) {
        return activeLanguageFetchPromise;
    }

    activeLanguageFetchPromise = (async () => {
        try {
            let token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : "";

            if (activeRefreshPromise) {
                token = await activeRefreshPromise;
            } else if (!token) {
                console.warn("Jatayu token not found, attempting login...");
                token = await refreshJatayuToken({ silent: true });
            }

            if (!token) {
                console.error("User not authenticated in Jatayu");
                return "Auto (Default)";
            }

            // Ensure session is registered and get valid sessionId first
            const sessionId = await ensureAndRegisterSession(token);
            if (!sessionId) {
                console.error("Session registration failed, skipping getLanguage");
                return "Auto (Default)";
            }

            let response = await fetch(`${HELPER_BASE_URL}/getLanguage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    session_id: sessionId,
                }),
            });

            if (response.status === 401) {
                console.warn("Jatayu token expired, attempting refresh login...");
                const freshToken = await refreshJatayuToken({ silent: true });

                if (!freshToken) {
                    console.error("Token refresh failed");
                    return "Auto (Default)";
                }

                // Register session for refreshed token
                const freshSessionId = await ensureAndRegisterSession(freshToken);
                if (!freshSessionId) {
                    console.error("Session registration failed during retry, skipping getLanguage");
                    return "Auto (Default)";
                }

                response = await fetch(`${HELPER_BASE_URL}/getLanguage`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${freshToken}`,
                    },
                    body: JSON.stringify({
                        session_id: freshSessionId,
                    }),
                });
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch language: ${response.status}`);
            }

            const data = await response.json();
            return data.language || "Auto (Default)";
        } catch (error) {
            console.error("Error fetching language from API:", error);
            return "Auto (Default)";
        } finally {
            activeLanguageFetchPromise = null;
        }
    })();

    return activeLanguageFetchPromise;
}

export async function saveLanguageToAPI(language: string, isDefault?: boolean): Promise<boolean> {
    try {
        let token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : "";

        if (activeRefreshPromise) {
            token = await activeRefreshPromise;
        } else if (!token) {
            console.warn("Jatayu token not found, attempting login...");
            token = await refreshJatayuToken();
        }

        if (!token) {
            console.error("User not authenticated in Jatayu");
            return false;
        }

        // Ensure session is registered and get valid sessionId first
        const sessionId = await ensureAndRegisterSession(token);
        if (!sessionId) {
            console.error("Session registration failed, skipping setLanguage");
            return false;
        }

        let response = await fetch(`${HELPER_BASE_URL}/setLanguage`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
                language: language,
                session_id: sessionId,
                set_as_default: isDefault || false,
            }),
        });

        if (response.status === 401) {
            console.warn("Jatayu token expired, attempting refresh login...");
            const freshToken = await refreshJatayuToken();

            if (!freshToken) {
                console.error("Token refresh failed");
                return false;
            }

            // Register session for refreshed token
            const freshSessionId = await ensureAndRegisterSession(freshToken);
            if (!freshSessionId) {
                console.error("Session registration failed during retry, skipping setLanguage");
                return false;
            }

            response = await fetch(`${HELPER_BASE_URL}/setLanguage`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${freshToken}`,
                },
                body: JSON.stringify({
                    language: language,
                    session_id: freshSessionId,
                    set_as_default: isDefault || false,
                }),
            });
        }

        if (!response.ok) {
            throw new Error(`Failed to save language: ${response.status}`);
        }

        const data = await response.json();
        console.log("Language saved to API successfully:", data);
        return true;
    } catch (error) {
        console.error("Error saving language to API:", error);
        return false;
    }
}

export async function uploadAudioChunk(formData: FormData, signal?: AbortSignal): Promise<any> {
    const token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : null;
    let response = await fetch(`${BASE_URL}/api/upload-and-transcribe`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData,
        signal
    });

    if (response.status === 401) {
        console.warn("Jatayu token expired, attempting refresh login...");
        try {
            const freshToken = await refreshJatayuToken();
            response = await fetch(`${BASE_URL}/api/upload-and-transcribe`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${freshToken}`
                },
                body: formData,
                signal
            });
        } catch (refreshErr) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 401 || errorText.includes("Session expired") || errorText.includes("log in again")) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
        throw new Error(errorText || `Failed to upload chunk: ${response.status}`);
    }

    return response.json();
}

export interface EndStreamRequest {
    name: string;
    transcript: string;
    fields: any[];
    source: string;
    language: string;
}

export async function endAudioStream(payload: EndStreamRequest, signal?: AbortSignal): Promise<any> {
    const token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : null;
    let response = await fetch(`${BASE_URL}/api/end-stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal
    });

    if (response.status === 401) {
        console.warn("Jatayu token expired, attempting refresh login...");
        try {
            const freshToken = await refreshJatayuToken();
            response = await fetch(`${BASE_URL}/api/end-stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${freshToken}`
                },
                body: JSON.stringify(payload),
                signal
            });
        } catch (refreshErr) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 401 || errorText.includes("Session expired") || errorText.includes("log in again")) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
        throw new Error(errorText || `Failed to end stream: ${response.status}`);
    }

    return response.json();
}

export interface CombineAudioRequest {
    chunk_id: string;
    name: string;
    email: string;
}

export async function combineAudioChunks(payload: CombineAudioRequest, signal?: AbortSignal): Promise<any> {
    const token = typeof window !== "undefined" ? localStorage.getItem("jatayuToken") : null;
    let response = await fetch(`${BASE_URL}/api/upload-combined-audio`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal
    });

    if (response.status === 401) {
        console.warn("Jatayu token expired, attempting refresh login...");
        try {
            const freshToken = await refreshJatayuToken();
            response = await fetch(`${BASE_URL}/api/upload-combined-audio`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${freshToken}`
                },
                body: JSON.stringify(payload),
                signal
            });
        } catch (refreshErr) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 401 || errorText.includes("Session expired") || errorText.includes("log in again")) {
            dispatchJatayuSessionExpired();
            throw new Error("JATAYU_SESSION_EXPIRED");
        }
        throw new Error(errorText || `Failed to combine audio: ${response.status}`);
    }

    return response.json();
}
