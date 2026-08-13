"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import { selectToken, selectIsAuthenticated } from "@/store/slices/authSlice";
import { API_BASE_URL } from "@/lib/config/api";

type NotificationCallback = (notification: { notificationData: any }) => void;
type DuplicateNumberRequestCallback = (data: any) => void;
type DuplicateNumberPermissionUpdateCallback = (data: any) => void;
type ContactChangeRequestCallback = (data: any) => void;
type ManageContactSettingsUpdateCallback = (data: any) => void;
type HealthCardChangeRequestCallback = (data: any) => void;
type HealthCardChangeRequestUpdateCallback = (data: any) => void;

// Global socket instance
let globalSocket: Socket | null = null;
let notificationCallbacks: Set<NotificationCallback> = new Set();
let duplicateNumberRequestCallbacks: Set<DuplicateNumberRequestCallback> = new Set();
let duplicateNumberPermissionUpdateCallbacks: Set<DuplicateNumberPermissionUpdateCallback> = new Set();
let contactChangeRequestCallbacks: Set<ContactChangeRequestCallback> = new Set();
let manageContactSettingsUpdateCallbacks: Set<ManageContactSettingsUpdateCallback> = new Set();
let healthCardChangeRequestCallbacks: Set<HealthCardChangeRequestCallback> = new Set();
let healthCardChangeRequestUpdateCallbacks: Set<HealthCardChangeRequestUpdateCallback> = new Set();
let isConnecting = false; // Flag to prevent multiple simultaneous connection attempts
let duplicateNumberRequestListenerAdded = false; // Track if listener has been added
let duplicateNumberPermissionUpdateListenerAdded = false; // Track if listener has been added
let contactChangeRequestListenerAdded = false; // Track if listener has been added
let manageContactSettingsUpdateListenerAdded = false; // Track if listener has been added
let healthCardChangeRequestListenerAdded = false; // Track if listener has been added
let healthCardChangeRequestUpdateListenerAdded = false; // Track if listener has been added

export const useSocket = () => {
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const socketRef = useRef<Socket | null>(null);

  // Get token - check Redux first, then localStorage
  // Memoize authToken to prevent unnecessary re-renders
  const authToken = useMemo(() => {
    if (token) {
      return token;
    }

    // Fallback to localStorage
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (storedToken) {
        return storedToken;
      }

      // Also check loginData in localStorage
      const storedLoginData = localStorage.getItem("loginData");
      if (storedLoginData) {
        try {
          const parsed = JSON.parse(storedLoginData);
          if (parsed?.access_token) {
            return parsed.access_token;
          }
        } catch (e) {
          console.error("Error parsing loginData from localStorage:", e);
        }
      }
    }

    return null;
  }, [token]);

  // Connect socket
  const connectSocket = useCallback(() => {
    if (!authToken) {
      return;
    }

    // If socket is already connected, skip
    if (globalSocket?.connected) {
      return;
    }

    // If socket exists but is connecting, skip (don't create duplicate)
    if (globalSocket || isConnecting) {
      return;
    }

    // Extract base URL for socket (socket.io connects to root, not API path)
    const socketUrl = API_BASE_URL.replace(/\/api\/v\d+$/, "");
    const fullSocketUrl = socketUrl + "/notifications";

    // Set connecting flag BEFORE creating socket to prevent race conditions
    isConnecting = true;

    const socket = io(fullSocketUrl, {
      // Use auth for socket.io v4+ (recommended for authentication)
      auth: {
        token: authToken,
      },
      // Also include in query for backward compatibility
      query: {
        token: authToken,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Add extra headers if needed (some servers expect Bearer token)
      extraHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    socket.on("connect", () => {
      isConnecting = false;
    });

    socket.on("disconnect", (reason) => {
      isConnecting = false;

      // Reset listener flags on disconnect (will be re-added on reconnect)
      duplicateNumberRequestListenerAdded = false;
      duplicateNumberPermissionUpdateListenerAdded = false;
      contactChangeRequestListenerAdded = false;
      manageContactSettingsUpdateListenerAdded = false;

      // If server disconnects due to authentication error, clean up
      // Otherwise, let socket.io handle reconnection automatically
      if (reason === "io server disconnect" || reason === "transport close") {
        // Don't clear globalSocket here - let reconnection handle it
        // If reconnection fails, connect_error will handle cleanup
      }
    });

    socket.on("connect_error", (error: Error) => {
      console.error("[Socket] ❌ Socket connection error:", error);
      console.error("[Socket] 🐛 Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      isConnecting = false;
    });

    socket.on("notification", (notification: { notificationData: any }) => {
      // Notify all registered callbacks
      notificationCallbacks.forEach((callback) => {
        callback(notification);
      });
    });

    // Add duplicate-number-request listener
    const handleDuplicateNumberRequest = (data: any) => {
      // Notify all registered callbacks
      duplicateNumberRequestCallbacks.forEach((callback) => {
        callback(data);
      });
    };

    // Register duplicate-number-request event listener
    socket.on("duplicate-number-request", (data: any) => {
      handleDuplicateNumberRequest(data);
    });
    duplicateNumberRequestListenerAdded = true;

    // Add duplicate-number-permission-update listener
    const handleDuplicateNumberPermissionUpdate = (data: any) => {
      // Notify all registered callbacks
      duplicateNumberPermissionUpdateCallbacks.forEach((callback) => {
        callback(data);
      });
    };

    // Register duplicate-number-permission-update event listener
    socket.on("duplicate-number-permission-update", (data: any) => {
      handleDuplicateNumberPermissionUpdate(data);
    });
    duplicateNumberPermissionUpdateListenerAdded = true;

    // Add contact-change-request listener
    const handleContactChangeRequest = (data: any) => {
      // Notify all registered callbacks
      contactChangeRequestCallbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("[Socket] ❌ Error executing contact-change-request callback:", error);
        }
      });
    };

    // Register contact-change-request event listener
    if (!contactChangeRequestListenerAdded) {
      socket.on("contact-change-request", (data: any) => {
        handleContactChangeRequest(data);
      });
      contactChangeRequestListenerAdded = true;
    }

    // Add manage-contact-settings-update listener
    const handleManageContactSettingsUpdate = (data: any) => {
      // Notify all registered callbacks
      manageContactSettingsUpdateCallbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("[Socket] ❌ Error executing manage-contact-settings-update callback:", error);
        }
      });
    };

    // Register manage-contact-settings-update event listener
    if (!manageContactSettingsUpdateListenerAdded) {
      socket.on("manage-contact-settings-update", (data: any) => {
        handleManageContactSettingsUpdate(data);
      });
      manageContactSettingsUpdateListenerAdded = true;
    }

    // Add health-card-change-request listener
    if (!healthCardChangeRequestListenerAdded) {
      socket.on("health-card-change-request", (data: any) => {
        healthCardChangeRequestCallbacks.forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error("[Socket] Error handling health-card-change-request:", err);
          }
        });
      });
      healthCardChangeRequestListenerAdded = true;
    }

    // Add health-card-change-request-update listener
    if (!healthCardChangeRequestUpdateListenerAdded) {
      socket.on("health-card-change-request-update", (data: any) => {
        healthCardChangeRequestUpdateCallbacks.forEach((cb) => {
          try {
            cb(data);
          } catch (err) {
            console.error("[Socket] Error handling health-card-change-request-update:", err);
          }
        });
      });
      healthCardChangeRequestUpdateListenerAdded = true;
    }

    globalSocket = socket;
    socketRef.current = socket;
  }, [authToken]);

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    // Don't disconnect if we're currently connecting
    if (isConnecting) {
      return;
    }

    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
      socketRef.current = null;
      isConnecting = false;
    }
  }, []);

  // Register notification callback
  const onNotification = useCallback((callback: NotificationCallback) => {
    notificationCallbacks.add(callback);
    return () => {
      notificationCallbacks.delete(callback);
    };
  }, []);

  // Register duplicate number request callback
  const onDuplicateNumberRequest = useCallback((callback: DuplicateNumberRequestCallback) => {
    duplicateNumberRequestCallbacks.add(callback);
    return () => {
      duplicateNumberRequestCallbacks.delete(callback);
    };
  }, []);

  // Register duplicate number permission update callback
  const onDuplicateNumberPermissionUpdate = useCallback((callback: DuplicateNumberPermissionUpdateCallback) => {
    duplicateNumberPermissionUpdateCallbacks.add(callback);
    return () => {
      duplicateNumberPermissionUpdateCallbacks.delete(callback);
    };
  }, []);

  // Register contact change request callback
  const onContactChangeRequest = useCallback((callback: ContactChangeRequestCallback) => {
    contactChangeRequestCallbacks.add(callback);
    return () => {
      contactChangeRequestCallbacks.delete(callback);
    };
  }, []);

  // Register manage contact settings update callback
  const onManageContactSettingsUpdate = useCallback((callback: ManageContactSettingsUpdateCallback) => {
    manageContactSettingsUpdateCallbacks.add(callback);
    return () => {
      manageContactSettingsUpdateCallbacks.delete(callback);
    };
  }, []);

  // Register health card change request callback
  const onHealthCardChangeRequest = useCallback((callback: HealthCardChangeRequestCallback) => {
    healthCardChangeRequestCallbacks.add(callback);
    return () => {
      healthCardChangeRequestCallbacks.delete(callback);
    };
  }, []);

  // Register health card change request update callback
  const onHealthCardChangeRequestUpdate = useCallback((callback: HealthCardChangeRequestUpdateCallback) => {
    healthCardChangeRequestUpdateCallbacks.add(callback);
    return () => {
      healthCardChangeRequestUpdateCallbacks.delete(callback);
    };
  }, []);

  // Emit mark as read
  const markNotificationAsRead = useCallback((notification_id: number) => {
    if (globalSocket?.connected) {
      globalSocket.emit("markNotificationAsRead", { notification_id });
    }
  }, []);

  // Ensure event listeners are set up if socket already exists
  useEffect(() => {
    if (globalSocket) {
      if (!duplicateNumberRequestListenerAdded) {
        const handleDuplicateNumberRequest = (data: any) => {
          // Notify all registered callbacks
          duplicateNumberRequestCallbacks.forEach((callback) => {
            callback(data);
          });
        };
        globalSocket.on("duplicate-number-request", handleDuplicateNumberRequest);
        duplicateNumberRequestListenerAdded = true;
      }

      if (!duplicateNumberPermissionUpdateListenerAdded) {
        const handleDuplicateNumberPermissionUpdate = (data: any) => {
          // Notify all registered callbacks
          duplicateNumberPermissionUpdateCallbacks.forEach((callback) => {
            callback(data);
          });
        };
        globalSocket.on("duplicate-number-permission-update", handleDuplicateNumberPermissionUpdate);
        duplicateNumberPermissionUpdateListenerAdded = true;
      }

      if (!contactChangeRequestListenerAdded) {
        const handleContactChangeRequest = (data: any) => {
          // Notify all registered callbacks
          contactChangeRequestCallbacks.forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error("[Socket] ❌ Error executing contact-change-request callback:", error);
            }
          });
        };
        globalSocket.on("contact-change-request", handleContactChangeRequest);
        contactChangeRequestListenerAdded = true;
      }

      if (!healthCardChangeRequestListenerAdded) {
        globalSocket.on("health-card-change-request", (data: any) => {
          healthCardChangeRequestCallbacks.forEach((cb) => cb(data));
        });
        healthCardChangeRequestListenerAdded = true;
      }

      if (!healthCardChangeRequestUpdateListenerAdded) {
        globalSocket.on("health-card-change-request-update", (data: any) => {
          healthCardChangeRequestUpdateCallbacks.forEach((cb) => cb(data));
        });
        healthCardChangeRequestUpdateListenerAdded = true;
      }
    }
  }, [globalSocket]);

  // Connect on mount and when authenticated
  useEffect(() => {
    // Only connect if authenticated and has token
    if (isAuthenticated && authToken) {
      // Only connect if no socket instance exists and we're not connecting
      // This prevents multiple connection attempts from different hook instances
      if (!globalSocket && !isConnecting) {
        // connectSocket();
      }
    } else {
      // Only disconnect if socket is actually connected
      // Don't clean up disconnected sockets here - let socket.io handle reconnection
      // Only explicitly disconnect when user logs out (isAuthenticated becomes false)
      if (globalSocket?.connected && !isConnecting) {
        disconnectSocket();
      }
      // Don't clean up non-connected sockets - they might be reconnecting
    }

    return () => {
      // Don't disconnect on unmount, only on logout
      // The socket should persist across component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authToken]); // Removed connectSocket and disconnectSocket from deps to prevent re-render loops

  return {
    socket: socketRef.current || globalSocket,
    isConnected: globalSocket?.connected || false,
    onNotification,
    onDuplicateNumberRequest,
    onDuplicateNumberPermissionUpdate,
    onContactChangeRequest,
    onManageContactSettingsUpdate,
    onHealthCardChangeRequest,
    onHealthCardChangeRequestUpdate,
    markNotificationAsRead,
  };
};

