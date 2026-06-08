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

const BASE_URL = "https://advanced-core-api-pvrrcvbtkq-el.a.run.app";
const AUTH_BASE_URL = "https://jeenasikho-auth-pvrrcvbtkq-el.a.run.app";
const STATIC_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg1NGFhNGMyM2VkZTdiOGNhODc1OWZiMDZlNmExZDU4OTI0MjVkMDYiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmVlbmFTaWtobywgVXNlcjEiLCJzdWJzY3JpYmVkIjpmYWxzZSwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2plZW5hc2lraG8tdm9pY2Vkb2NhaS1zZGEiLCJhdWQiOiJqZWVuYXNpa2hvLXZvaWNlZG9jYWktc2RhIiwiYXV0aF90aW1lIjoxNzgwNTY3MTQ5LCJ1c2VyX2lkIjoicG5UdUpCVU1PTVk5b3hBMExNbE5vRVBmQnpqMSIsInN1YiI6InBuVHVKQlVNT01ZOW94QTBMTWxOb0VQZkJ6ajEiLCJpYXQiOjE3ODA1NjcxNDksImV4cCI6MTc4MDU3MDc0OSwiZW1haWwiOiJqZWVuYTFzaWtob0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInBob25lX251bWJlciI6Iis5MTkyNDY1NDQ0NDQiLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbImplZW5hMXNpa2hvQGdtYWlsLmNvbSJdLCJwaG9uZSI6WyIrOTE5MjQ2NTQ0NDQ0Il19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.FDyEsn5MpWZjjIZzJ4NiMEGSp1bbjtroCDPZr5-NsKsl7nRRjckiyQsVseYHppx9-iUY85cyz8E4Dqrqwxvy5L94j4IKui4-QQt0frrS9Kh3SuAPxR7NCP9FHH5IIg07ovxBOttVjUzGCghDJdVV4qfZBsQ_f1s-Fh5kU4a6TwUnNEJLGGHjeO6FzKCL03IedpOHEz4Ffft73tN00k68vwU0IiPi2ykjz0MDF7bMXghFzivvYPbl48q29vnuraN-J4qU7bxCgSQVYzx1ZJhoRgSZdd1GnYLTCOGONsDObFgCCaVBoRNZi_b83siCpmOLctnu-5i8ChTM7URa4WLA0w";

export async function loginJatayu(): Promise<{ token: string; [key: string]: any }> {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: "jeena1sikho@gmail.com",
            password: "BlueSky@47"
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Jatayu Login failed with status ${response.status}`);
    }

    let data = await response.json();
    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse double-stringified login response", e);
        }
    }

    const token = data.token;
    if (token && typeof window !== "undefined") {
        localStorage.setItem("jatayuToken", token);
    }
    return data;
}

export async function logoutJatayu(): Promise<void> {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("jatayuToken");
    
    // Clear localStorage first so local state is cleaned up regardless of api result
    localStorage.removeItem("jatayuToken");

    if (!token) return;

    try {
        const response = await fetch(`${AUTH_BASE_URL}/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                emailid: "jeena1sikho@gmail.com"
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
    const activeToken = token || STATIC_TOKEN;
    const response = await fetch(`${BASE_URL}/api/upload_return`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API request failed with status ${response.status}`);
    }

    return response.json();
}
