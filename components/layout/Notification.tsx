"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import moment from "moment";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollableContainer } from "@/components/ui";
import { selectLoginData, selectUserId } from "@/store/slices/authSlice";
import { useGetAllNotificationsQuery, useMarkNotificationAsReadMutation } from "@/store/api/notificationApi";
import { useSocket } from "@/hooks/useSocket";

type Notification = {
  notification_id: number;
  message: string;
  is_read: boolean;
  created_date: string;
};

// Duplicate number notification type
type DuplicateNumberNotification = {
  id: string; // Unique ID for localStorage notifications
  message: string;
  contactNo: string;
  patientName: string;
  status?: string;
  relationship?: string;
  is_read: boolean;
  created_date: string;
  type: "duplicate-number-request" | "duplicate-number-permission-update";
};

// Contact change request notification type
type ContactChangeRequestNotification = {
  id: string; // Unique ID for localStorage notifications
  message: string;
  oldContactNo: string;
  newContactNo: string;
  patientName: string;
  status?: string;
  is_read: boolean;
  created_date: string;
  type: "contact-change-request";
};

// LocalStorage key for duplicate number notifications
const DUPLICATE_NUMBER_NOTIFICATIONS_KEY = "duplicateNumberNotifications";

// LocalStorage key for contact change request notifications
const CONTACT_CHANGE_REQUEST_NOTIFICATIONS_KEY = "contactChangeRequestNotifications";

// LocalStorage keys for duplicate exception patients (separate for hospital and clinic)
const DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY = "duplicateExceptionPatientsHospital";
const DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY = "duplicateExceptionPatientsClinic";

// Interface for duplicate exception patient
interface DuplicateExceptionPatient {
  id: string;
  patientName: string;
  contactNo: string;
  savedAt: string;
  status: "pending" | "approved" | "rejected";
}

type NotificationDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead?: () => void;
  notificationCount?: number;
  onNotificationCountChange?: (count: number) => void;
};

export function NotificationDropdown({
  isOpen,
  onClose,
  onMarkAllAsRead,
  notificationCount = 0,
  onNotificationCountChange,
}: NotificationDropdownProps) {
  const loginData = useSelector(selectLoginData);
  const userId = useSelector(selectUserId);
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [duplicateNumberNotificationList, setDuplicateNumberNotificationList] = useState<DuplicateNumberNotification[]>([]);
  const [contactChangeRequestNotificationList, setContactChangeRequestNotificationList] = useState<ContactChangeRequestNotification[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [limit, setLimit] = useState(15);
  const [scrollThreshold, setScrollThreshold] = useState(155);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastProcessedContactChangeRequestRef = useRef<{ id?: number; timestamp: number } | null>(null);

  // Use shared socket connection
  const { onNotification, markNotificationAsRead: socketMarkAsRead, onDuplicateNumberRequest, onDuplicateNumberPermissionUpdate, onContactChangeRequest, onManageContactSettingsUpdate } = useSocket();
  
  // LocalStorage functions for duplicate number notifications
  const getDuplicateNumberNotifications = useCallback((): DuplicateNumberNotification[] => {
    if (typeof window === "undefined") return [];
    
    try {
      const stored = localStorage.getItem(DUPLICATE_NUMBER_NOTIFICATIONS_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as DuplicateNumberNotification[];
    } catch (error) {
      console.error("Failed to load duplicate number notifications:", error);
      return [];
    }
  }, []);

  const saveDuplicateNumberNotification = useCallback((notification: Omit<DuplicateNumberNotification, "id" | "created_date">) => {
    if (typeof window === "undefined") return;
    
    try {
      const existing = getDuplicateNumberNotifications();
      const newNotification: DuplicateNumberNotification = {
        ...notification,
        id: `dup_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_date: new Date().toISOString(),
      };
      
      // Add new notification at the beginning (most recent first)
      const updated = [newNotification, ...existing];
      
      // Keep only last 100 notifications to prevent localStorage from getting too large
      const trimmed = updated.slice(0, 100);
      
      localStorage.setItem(DUPLICATE_NUMBER_NOTIFICATIONS_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error("Failed to save duplicate number notification:", error);
    }
  }, [getDuplicateNumberNotifications]);

  const markDuplicateNumberNotificationAsRead = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    
    try {
      const existing = getDuplicateNumberNotifications();
      const updated = existing.map((notif) =>
        notif.id === id ? { ...notif, is_read: true } : notif
      );
      localStorage.setItem(DUPLICATE_NUMBER_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to mark duplicate number notification as read:", error);
    }
  }, [getDuplicateNumberNotifications]);

  const markAllDuplicateNumberNotificationsAsRead = useCallback(() => {
    if (typeof window === "undefined") return;
    
    try {
      const existing = getDuplicateNumberNotifications();
      const updated = existing.map((notif) => ({ ...notif, is_read: true }));
      localStorage.setItem(DUPLICATE_NUMBER_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to mark all duplicate number notifications as read:", error);
    }
  }, [getDuplicateNumberNotifications]);

  // Update duplicate exception patient status in localStorage (for both hospital and clinic)
  const updateDuplicateExceptionPatientStatus = useCallback((contactNo: string, patientName: string, status: "approved" | "rejected") => {
    if (typeof window === "undefined") return;
    
    const normalizedContactNo = contactNo.trim();
    const normalizedPatientName = patientName.trim();
    const normalizedStatus = status.toLowerCase() as "approved" | "rejected" | "pending";
    
    // Update hospital duplicate exception patients
    try {
      const hospitalStored = localStorage.getItem(DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY);
      if (hospitalStored) {
        const existing: DuplicateExceptionPatient[] = JSON.parse(hospitalStored);
        const updated = existing.map(patient => {
          const patientContactNo = patient.contactNo.trim();
          const patientNameTrimmed = patient.patientName.trim();
          
          if (patientContactNo === normalizedContactNo && 
              patientNameTrimmed.toLowerCase() === normalizedPatientName.toLowerCase()) {
            return { ...patient, status: normalizedStatus };
          }
          return patient;
        });
        
        const wasUpdated = updated.some((patient, index) => patient.status !== existing[index]?.status);
        if (wasUpdated) {
          localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_HOSPITAL_KEY, JSON.stringify(updated));
          // Dispatch custom event to notify registration pages
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent('duplicateExceptionPatientStatusUpdated', {
              detail: { type: 'hospital', contactNo: normalizedContactNo, patientName: normalizedPatientName, status: normalizedStatus }
            }));
          }
        }
      }
    } catch (error) {
      console.error("[Notification] Failed to update hospital duplicate exception patient status:", error);
    }
    
    // Update clinic duplicate exception patients
    try {
      const clinicStored = localStorage.getItem(DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY);
      if (clinicStored) {
        const existing: DuplicateExceptionPatient[] = JSON.parse(clinicStored);
        const updated = existing.map(patient => {
          const patientContactNo = patient.contactNo.trim();
          const patientNameTrimmed = patient.patientName.trim();
          
          if (patientContactNo === normalizedContactNo && 
              patientNameTrimmed.toLowerCase() === normalizedPatientName.toLowerCase()) {
            return { ...patient, status: normalizedStatus };
          }
          return patient;
        });
        
        const wasUpdated = updated.some((patient, index) => patient.status !== existing[index]?.status);
        if (wasUpdated) {
          localStorage.setItem(DUPLICATE_EXCEPTION_PATIENTS_CLINIC_KEY, JSON.stringify(updated));
          // Dispatch custom event to notify registration pages
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent('duplicateExceptionPatientStatusUpdated', {
              detail: { type: 'clinic', contactNo: normalizedContactNo, patientName: normalizedPatientName, status: normalizedStatus }
            }));
          }
        }
      }
    } catch (error) {
      console.error("[Notification] Failed to update clinic duplicate exception patient status:", error);
    }
  }, []);

  // Get user data - check Redux first, then localStorage
  const getUserData = useCallback(() => {
    if (loginData?.user?.id && loginData?.login_type) {
      return {
        user_id: loginData.user.id,
        login_type: loginData.login_type,
      };
    }

    // Fallback to localStorage
    if (typeof window !== "undefined") {
      const storedLoginData = localStorage.getItem("loginData");
      if (storedLoginData) {
        try {
          const parsed = JSON.parse(storedLoginData);
          if (parsed?.user?.id && parsed?.login_type) {
            return {
              user_id: parsed.user.id,
              login_type: parsed.login_type,
            };
          }
        } catch (e) {
          console.error("Error parsing loginData from localStorage:", e);
        }
      }
    }

    return null;
  }, [loginData]);

  const userData = getUserData();

  // Fetch notifications using RTK Query
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useGetAllNotificationsQuery(
    {
      role_name: userData?.login_type || "admin",
      user_id: userData?.user_id || 0,
      limit,
    },
    {
      skip: !userData?.user_id || !isOpen,
    }
  );

  const [markAsReadMutation] = useMarkNotificationAsReadMutation();

  // Load duplicate number notifications from localStorage on mount
  useEffect(() => {
    const duplicateNotifications = getDuplicateNumberNotifications();
    setDuplicateNumberNotificationList(duplicateNotifications);
  }, [getDuplicateNumberNotifications]);

  // Notify parent component when unread count changes (separate effect to avoid render phase updates)
  useEffect(() => {
    if (onNotificationCountChange) {
      onNotificationCountChange(unreadCount);
    }
  }, [unreadCount, onNotificationCountChange]);

  // Initialize notifications from API and calculate total unread count
  useEffect(() => {
    if (notificationsData?.success && notificationsData.data) {
      setNotificationList(notificationsData.data.rows);
      setTotalCount(notificationsData.data.count);
      
      // Calculate total unread count including duplicate number and contact change request notifications
      const duplicateUnreadCount = duplicateNumberNotificationList.filter((n) => !n.is_read).length;
      const contactChangeUnreadCount = contactChangeRequestNotificationList.filter((n) => !n.is_read).length;
      const apiUnreadCount = notificationsData.data.unreadCount || 0;
      const totalUnread = apiUnreadCount + duplicateUnreadCount + contactChangeUnreadCount;
      
      setUnreadCount(totalUnread);
    } else {
      // If no API notifications, only count duplicate number and contact change request notifications
      const duplicateUnreadCount = duplicateNumberNotificationList.filter((n) => !n.is_read).length;
      const contactChangeUnreadCount = contactChangeRequestNotificationList.filter((n) => !n.is_read).length;
      setUnreadCount(duplicateUnreadCount + contactChangeUnreadCount);
    }
  }, [notificationsData, duplicateNumberNotificationList, contactChangeRequestNotificationList]);

  // Listen to socket notifications
  useEffect(() => {
    const unsubscribe = onNotification((notification: { notificationData: Notification }) => {
      if (notification?.notificationData) {
        setNotificationList((prev) => [notification.notificationData, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setTotalCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [onNotification]);

  // Listen to duplicate-number-request socket event
  useEffect(() => {
    const unsubscribe = onDuplicateNumberRequest((socketData: any) => {
      // Extract data from socket event
      const data = socketData?.data || socketData;
      const message = socketData?.message || `Duplicate number approval requested for ${data?.contactNo || ""}`;
      
      if (data?.contactNo && data?.patientName) {
        const notification: Omit<DuplicateNumberNotification, "id" | "created_date"> = {
          message,
          contactNo: data.contactNo,
          patientName: data.patientName,
          status: data.status || "pending",
          relationship: data.relationship,
          is_read: false,
          type: "duplicate-number-request",
        };
        
        // Save to localStorage (this will generate id and created_date)
        saveDuplicateNumberNotification(notification);
        
        // Reload from localStorage to get the saved notification with id
        const updatedNotifications = getDuplicateNumberNotifications();
        setDuplicateNumberNotificationList(updatedNotifications);
        
        // Update unread count
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [onDuplicateNumberRequest, saveDuplicateNumberNotification, getDuplicateNumberNotifications]);

  // LocalStorage functions for contact change request notifications
  const getContactChangeRequestNotifications = useCallback((): ContactChangeRequestNotification[] => {
    if (typeof window === "undefined") return [];
    
    try {
      const stored = localStorage.getItem(CONTACT_CHANGE_REQUEST_NOTIFICATIONS_KEY);
      if (!stored) return [];
      return JSON.parse(stored) as ContactChangeRequestNotification[];
    } catch (error) {
      console.error("[Notification] Failed to load contact change request notifications:", error);
      return [];
    }
  }, []);

  const saveContactChangeRequestNotification = useCallback((notification: Omit<ContactChangeRequestNotification, "id" | "created_date">, notificationId?: number) => {
    if (typeof window === "undefined") return false; // Return false if not saved
    
    try {
      const existing = getContactChangeRequestNotifications();
      
      // Check for duplicates: same oldContactNo, newContactNo, patientName, and status within last 5 seconds
      const now = Date.now();
      const fiveSecondsAgo = now - 5000;
      
      const isDuplicate = existing.some((notif) => {
        const notifTime = new Date(notif.created_date).getTime();
        return (
          notif.oldContactNo === notification.oldContactNo &&
          notif.newContactNo === notification.newContactNo &&
          notif.patientName === notification.patientName &&
          notif.status === notification.status &&
          notifTime > fiveSecondsAgo // Within last 5 seconds
        );
      });

      // Also check by notificationId if provided (from API)
      const isDuplicateById = notificationId 
        ? existing.some((notif) => {
            // Check if notification ID matches (extract from id string)
            const notifIdMatch = notif.id.match(/contact_change_(\d+)_/);
            if (notifIdMatch) {
              const notifTimestamp = parseInt(notifIdMatch[1]);
              // Check if same notification ID and within 5 seconds
              return notifTimestamp > fiveSecondsAgo;
            }
            return false;
          })
        : false;

      if (isDuplicate || isDuplicateById) {
        return false; // Notification already exists
      }
      
      const newNotification: ContactChangeRequestNotification = {
        ...notification,
        id: notificationId 
          ? `contact_change_${notificationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          : `contact_change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_date: new Date().toISOString(),
      };
      
      // Add new notification at the beginning (most recent first)
      const updated = [newNotification, ...existing];
      
      // Keep only last 100 notifications to prevent localStorage from getting too large
      const trimmed = updated.slice(0, 100);
      
      localStorage.setItem(CONTACT_CHANGE_REQUEST_NOTIFICATIONS_KEY, JSON.stringify(trimmed));
      return true; // Successfully saved
    } catch (error) {
      console.error("[Notification] ❌ Failed to save contact change request notification:", error);
      return false;
    }
  }, [getContactChangeRequestNotifications]);

  const markContactChangeRequestNotificationAsRead = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    
    try {
      const existing = getContactChangeRequestNotifications();
      const updated = existing.map((notif) =>
        notif.id === id ? { ...notif, is_read: true } : notif
      );
      localStorage.setItem(CONTACT_CHANGE_REQUEST_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("[Notification] Failed to mark contact change request notification as read:", error);
    }
  }, [getContactChangeRequestNotifications]);

  // Load contact change request notifications from localStorage on mount
  useEffect(() => {
    const contactChangeNotifications = getContactChangeRequestNotifications();
    setContactChangeRequestNotificationList(contactChangeNotifications);
  }, [getContactChangeRequestNotifications]);

  // Listen to contact-change-request socket event
  useEffect(() => {
    const unsubscribe = onContactChangeRequest((socketData: any) => {
      try {
        // Extract data from socket event
        const data = socketData?.data || socketData;
        const notificationId = data?.id;
        const currentTimestamp = Date.now();
        
        // Check if we've already processed this notification recently (within 2 seconds)
        if (
          lastProcessedContactChangeRequestRef.current &&
          lastProcessedContactChangeRequestRef.current.id === notificationId &&
          (currentTimestamp - lastProcessedContactChangeRequestRef.current.timestamp) < 2000
        ) {
          return;
        }
        
        // Update last processed notification
        if (notificationId) {
          lastProcessedContactChangeRequestRef.current = {
            id: notificationId,
            timestamp: currentTimestamp,
          };
        }
        
        const message = socketData?.message || `Contact number change request from ${data?.oldContactNo || ""} to ${data?.newContactNo || ""}`;
        
        if (data?.oldContactNo && data?.newContactNo && data?.patientName) {
          const notification: Omit<ContactChangeRequestNotification, "id" | "created_date"> = {
            message,
            oldContactNo: data.oldContactNo,
            newContactNo: data.newContactNo,
            patientName: data.patientName,
            status: data.status?.toLowerCase() || "pending",
            is_read: false,
            type: "contact-change-request",
          };
          
          // Save to localStorage (this will generate id and created_date)
          // Pass notification ID from data if available to help with deduplication
          const wasSaved = saveContactChangeRequestNotification(notification, data?.id);
          
          // Only update state if notification was actually saved (not a duplicate)
          if (wasSaved) {
            // Reload from localStorage to get the saved notification with id
            const updatedNotifications = getContactChangeRequestNotifications();
            setContactChangeRequestNotificationList(updatedNotifications);
            
            // Update unread count
            setUnreadCount((prev) => prev + 1);
          }
        } else {
          console.warn("[Notification] ⚠️ Missing required data in contact change request:", data);
        }

        // Refetch notifications from API only if query is enabled (not skipped)
        if (userData?.user_id && isOpen) {
          refetchNotifications()
            .then((result) => {
              if (result?.data?.success) {
                // Notifications refetched successfully
              } else {
                console.warn("[Notification] ⚠️ Refetch returned unsuccessful result:", result);
              }
            })
            .catch((error) => {
              console.error("[Notification] ❌ Error refetching notifications:", error);
            });
        }
      } catch (error) {
        console.error("[Notification] ❌ Error handling contact-change-request event:", error);
      }
    });

    return unsubscribe;
  }, [onContactChangeRequest, refetchNotifications, userData, isOpen, saveContactChangeRequestNotification, getContactChangeRequestNotifications]);

  // Listen to duplicate-number-permission-update socket event
  useEffect(() => {
    const unsubscribe = onDuplicateNumberPermissionUpdate((socketData: any) => {
      // Extract data from socket event
      const data = socketData?.data || socketData;
      const message = socketData?.message || `Duplicate number ${data?.contactNo || ""} ${data?.status || "updated"}`;
      
      if (data?.contactNo && data?.patientName) {
        // Update duplicate exception patient status in localStorage (for both hospital and clinic)
        // This ensures that when approval happens on any page, the localStorage is updated
        if (data?.status && (data.status.toLowerCase() === "approved" || data.status.toLowerCase() === "rejected")) {
          updateDuplicateExceptionPatientStatus(
            data.contactNo, 
            data.patientName, 
            data.status.toLowerCase() as "approved" | "rejected"
          );
        }
        
        const notification: Omit<DuplicateNumberNotification, "id" | "created_date"> = {
          message,
          contactNo: data.contactNo,
          patientName: data.patientName,
          status: data.status?.toLowerCase() || "pending",
          is_read: false,
          type: "duplicate-number-permission-update",
        };
        
        // Save to localStorage (this will generate id and created_date)
        saveDuplicateNumberNotification(notification);
        
        // Reload from localStorage to get the saved notification with id
        const updatedNotifications = getDuplicateNumberNotifications();
        setDuplicateNumberNotificationList(updatedNotifications);
        
        // Update unread count
        setUnreadCount((prev) => prev + 1);
      }
    });

    return unsubscribe;
  }, [onDuplicateNumberPermissionUpdate, saveDuplicateNumberNotification, getDuplicateNumberNotifications, updateDuplicateExceptionPatientStatus]);

  // Listen to manage-contact-settings-update socket event (for approve/reject actions)
  useEffect(() => {
    const unsubscribe = onManageContactSettingsUpdate((socketData: any) => {
      try {
        // Extract data from socket event
        const data = socketData?.data || socketData;
        
        // Use the message from socket event if available, otherwise create a descriptive message
        let message = socketData?.message;
        if (!message && data) {
          const status = data.status?.toLowerCase() || "updated";
          const statusText = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated";
          if (data.oldContactNo && data.newContactNo) {
            message = `Contact number change request from ${data.oldContactNo} to ${data.newContactNo} has been ${statusText}`;
          } else if (data.newContactNo) {
            message = `Contact number change request to ${data.newContactNo} has been ${statusText}`;
          } else {
            message = `Contact number change request has been ${statusText}`;
          }
        }
        
        if (data?.oldContactNo && data?.newContactNo && data?.patientName) {
          const notification: Omit<ContactChangeRequestNotification, "id" | "created_date"> = {
            message: message || `Contact number change request ${data.status?.toLowerCase() || "updated"}`,
            oldContactNo: data.oldContactNo,
            newContactNo: data.newContactNo,
            patientName: data.patientName,
            status: data.status?.toLowerCase() || "pending",
            is_read: false,
            type: "contact-change-request",
          };
          
          // Save to localStorage (this will generate id and created_date)
          // Pass notification ID from data if available to help with deduplication
          const wasSaved = saveContactChangeRequestNotification(notification, data?.id);
          
          // Only update state if notification was actually saved (not a duplicate)
          if (wasSaved) {
            // Reload from localStorage to get the saved notification with id
            const updatedNotifications = getContactChangeRequestNotifications();
            setContactChangeRequestNotificationList(updatedNotifications);
            
            // Update unread count
            setUnreadCount((prev) => prev + 1);
          }
        } else {
          console.warn("[Notification] ⚠️ Missing required data in manage contact settings update:", data);
        }

        // Refetch notifications from API only if query is enabled (not skipped)
        if (userData?.user_id && isOpen) {
          refetchNotifications()
            .then((result) => {
              if (result?.data?.success) {
                // Notifications refetched successfully
              } else {
                console.warn("[Notification] ⚠️ Refetch returned unsuccessful result:", result);
              }
            })
            .catch((error) => {
              console.error("[Notification] ❌ Error refetching notifications:", error);
            });
        }
      } catch (error) {
        console.error("[Notification] ❌ Error handling manage-contact-settings-update event:", error);
      }
    });

    return unsubscribe;
  }, [onManageContactSettingsUpdate, refetchNotifications, userData, isOpen, saveContactChangeRequestNotification, getContactChangeRequestNotifications]);

  // Mark notification as read (for API notifications)
  const onMarkAsRead = useCallback(
    async (notification_id: number) => {
      setNotificationList((prevList) => {
        const updatedList = prevList.map((item) => {
          if (item.notification_id === notification_id && !item.is_read) {
            return { ...item, is_read: true };
          }
          return item;
        });
        return updatedList;
      });

      setUnreadCount((prevCount) => Math.max(0, prevCount - 1));

      // Emit to socket
      socketMarkAsRead(notification_id);

      // Call API
      try {
        await markAsReadMutation({ notification_id }).unwrap();
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    [markAsReadMutation, socketMarkAsRead]
  );

  // Mark duplicate number notification as read
  const onMarkDuplicateNumberNotificationAsRead = useCallback(
    (id: string) => {
      setDuplicateNumberNotificationList((prevList) => {
        const updatedList = prevList.map((item) => {
          if (item.id === id && !item.is_read) {
            return { ...item, is_read: true };
          }
          return item;
        });
        return updatedList;
      });

      setUnreadCount((prevCount) => Math.max(0, prevCount - 1));

      // Update localStorage
      markDuplicateNumberNotificationAsRead(id);
    },
    [markDuplicateNumberNotificationAsRead]
  );

  // Mark contact change request notification as read
  const onMarkContactChangeRequestNotificationAsRead = useCallback(
    (id: string) => {
      setContactChangeRequestNotificationList((prevList) => {
        const updatedList = prevList.map((item) => {
          if (item.id === id && !item.is_read) {
            return { ...item, is_read: true };
          }
          return item;
        });
        return updatedList;
      });

      setUnreadCount((prevCount) => Math.max(0, prevCount - 1));

      // Update localStorage
      markContactChangeRequestNotificationAsRead(id);
    },
    [markContactChangeRequestNotificationAsRead]
  );

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    const unreadNotifications = notificationList.filter((item) => !item.is_read);
    const unreadDuplicateNotifications = duplicateNumberNotificationList.filter((item) => !item.is_read);
    const unreadContactChangeNotifications = contactChangeRequestNotificationList.filter((item) => !item.is_read);
    
    setNotificationList((prevList) =>
      prevList.map((item) => ({ ...item, is_read: true }))
    );
    setDuplicateNumberNotificationList((prevList) =>
      prevList.map((item) => ({ ...item, is_read: true }))
    );
    setContactChangeRequestNotificationList((prevList) =>
      prevList.map((item) => ({ ...item, is_read: true }))
    );
    setUnreadCount(0);

    // Mark all duplicate number notifications as read in localStorage
    markAllDuplicateNumberNotificationsAsRead();

    // Mark all contact change request notifications as read in localStorage
    if (typeof window !== "undefined") {
      try {
        const existing = getContactChangeRequestNotifications();
        const updated = existing.map((notif) => ({ ...notif, is_read: true }));
        localStorage.setItem(CONTACT_CHANGE_REQUEST_NOTIFICATIONS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("[Notification] Failed to mark all contact change request notifications as read:", error);
      }
    }

    // Emit to socket for all unread API notifications
    unreadNotifications.forEach((item) => {
      socketMarkAsRead(item.notification_id);
    });

    // Call API for all API notifications
    try {
      await Promise.all(
        unreadNotifications.map((item) =>
          markAsReadMutation({ notification_id: item.notification_id }).unwrap()
        )
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }

    onMarkAllAsRead?.();
  }, [notificationList, duplicateNumberNotificationList, markAsReadMutation, onMarkAllAsRead, markAllDuplicateNumberNotificationsAsRead, socketMarkAsRead]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = scrollContainerRef.current;
      if (
        scrollContainer &&
        scrollContainer.scrollTop >= scrollThreshold &&
        !isFetching &&
        notificationList.length < totalCount
      ) {
        setLimit((prevLimit) => prevLimit + 15);
        setScrollThreshold((prevThreshold) => prevThreshold + 155);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener("scroll", handleScroll);

    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [isFetching, notificationList.length, totalCount, scrollThreshold]);

  // Combine API notifications and duplicate number notifications
  // Convert duplicate number notifications to match Notification format for display
  const allNotifications = useMemo(() => {
    const duplicateAsNotifications: (Notification & { duplicateId?: string; contactChangeId?: string })[] = duplicateNumberNotificationList.map((dup) => ({
      notification_id: parseInt(dup.id.replace(/\D/g, "")) || 0, // Convert id to number
      message: dup.message,
      is_read: dup.is_read,
      created_date: dup.created_date,
      // Store duplicate notification ID for marking as read
      duplicateId: dup.id,
    }));

    const contactChangeAsNotifications: (Notification & { duplicateId?: string; contactChangeId?: string })[] = contactChangeRequestNotificationList.map((contact) => ({
      notification_id: parseInt(contact.id.replace(/\D/g, "")) || 0, // Convert id to number
      message: contact.message,
      is_read: contact.is_read,
      created_date: contact.created_date,
      // Store contact change notification ID for marking as read
      contactChangeId: contact.id,
    }));
    
    // Combine and sort by date (most recent first)
    const combined = [...notificationList, ...duplicateAsNotifications, ...contactChangeAsNotifications].sort((a, b) => {
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });
    
    return combined;
  }, [notificationList, duplicateNumberNotificationList, contactChangeRequestNotificationList]);

  // Group notifications by time
  const today = moment().startOf("day");
  const yesterday = moment().subtract(1, "day").startOf("day");
  const startOfWeek = moment().startOf("week");
  const startOfMonth = moment().startOf("month");
  const startOfYear = moment().startOf("year");

  const groupedNotifications = allNotifications.reduce(
    (acc, notification) => {
      const createdDate = moment(notification.created_date);

      if (createdDate.isSame(today, "day")) {
        acc.today.push(notification);
      } else if (createdDate.isSame(yesterday, "day")) {
        acc.yesterday.push(notification);
      } else if (createdDate.isSameOrAfter(startOfWeek)) {
        acc.thisWeek.push(notification);
      } else if (createdDate.isSameOrAfter(startOfMonth)) {
        acc.thisMonth.push(notification);
      } else if (createdDate.isSameOrAfter(startOfYear)) {
        acc.thisYear.push(notification);
      } else {
        acc.earlier.push(notification);
      }
      return acc;
    },
    {
      today: [] as (Notification & { duplicateId?: string })[],
      yesterday: [] as (Notification & { duplicateId?: string })[],
      thisWeek: [] as (Notification & { duplicateId?: string })[],
      thisMonth: [] as (Notification & { duplicateId?: string })[],
      thisYear: [] as (Notification & { duplicateId?: string })[],
      earlier: [] as (Notification & { duplicateId?: string })[],
    }
  );

  // Format time ago
  const formatTimeAgo = (date: string) => {
    return moment(date).fromNow();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-3 w-[550px] bg-white border border-[#EAECF0] rounded-lg shadow-lg z-50 pointer-events-auto">
      {/* White triangle pointer at top center */}
      <div className="absolute -top-[15px] right-6">
        <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-b-[18px] border-l-transparent border-r-transparent border-b-white"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0]">
        <h3 className="text-[18px] font-medium leading-[150%] text-[#344054]">
          Notification
        </h3>
        <button
          type="button"
          onClick={handleMarkAllAsRead}
          className="text-[14px] font-medium leading-[150%] text-[#0B8C00] hover:underline cursor-pointer"
        >
          Mark all as read
        </button>
      </div>

      {/* Notification Content */}
      <ScrollableContainer
        ref={scrollContainerRef}
        maxHeight="449px"
        showScrollbar={true}
      >
        {loading || isLoadingNotifications ? (
          <div className="text-center p-4">Loading...</div>
        ) : allNotifications.length === 0 ? (
          <div className="text-center p-4">No data available</div>
        ) : (
          <>
            {groupedNotifications.today.length > 0 && (
              <>
                <h5 className="text-[16px] font-semibold leading-[150%] text-[#0B8C00] px-6 py-2 mt-2">
                  Today
                </h5>
                <ul className="border-b border-[#EAECF0] pb-2">
                  {groupedNotifications.today.map((notif: Notification & { duplicateId?: string }) => (
                    <li key={notif.notification_id}>
                      <button
                        type="button"
                        className={`flex items-center justify-between w-full py-1.5 px-6 hover:bg-[#F9FAFB] transition-colors ${
                          !notif.is_read ? "font-semibold" : "font-normal"
                        }`}
                        onClick={() => {
                          if (!notif.is_read) {
                            // Check if it's a contact change request notification
                            if ((notif as any).contactChangeId) {
                              onMarkContactChangeRequestNotificationAsRead((notif as any).contactChangeId);
                            } else if ((notif as any).duplicateId) {
                              // Check if it's a duplicate number notification
                              onMarkDuplicateNumberNotificationAsRead((notif as any).duplicateId);
                            } else {
                              // Regular API notification
                              onMarkAsRead(notif.notification_id);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {!notif.is_read ? (
                            <svg
                              className="flex-shrink-0 self-center"
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="5" cy="5" r="5" fill="#0B8C00" />
                            </svg>
                          ) : (
                            <div className="w-[10px] h-[10px] flex-shrink-0"></div>
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <Tooltip content={notif.message} className="w-full">
                              <span className="text-[14px] leading-[150%] text-[#344054] truncate block w-full text-left">
                                {notif.message}
                              </span>
                            </Tooltip>
                          </div>
                        </div>
                        <span className="text-[12px] leading-[150%] text-[#C0C0C0] ml-2 flex-shrink-0 whitespace-nowrap">
                          {formatTimeAgo(notif.created_date)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {groupedNotifications.yesterday.length > 0 && (
              <>
                <h5 className="text-[16px] font-semibold leading-[150%] text-[#0B8C00] px-6 py-2 mt-2">
                  Yesterday
                </h5>
                <ul className="border-b border-[#EAECF0] pb-2">
                  {groupedNotifications.yesterday.map((notif) => (
                    <li key={notif.notification_id}>
                      <button
                        type="button"
                        className={`flex items-center justify-between w-full py-1.5 px-6 hover:bg-[#F9FAFB] transition-colors ${
                          !notif.is_read ? "font-semibold" : "font-normal"
                        }`}
                        onClick={() => {
                          if (!notif.is_read) {
                            // Check if it's a contact change request notification
                            if ((notif as any).contactChangeId) {
                              onMarkContactChangeRequestNotificationAsRead((notif as any).contactChangeId);
                            } else if ((notif as any).duplicateId) {
                              // Check if it's a duplicate number notification
                              onMarkDuplicateNumberNotificationAsRead((notif as any).duplicateId);
                            } else {
                              // Regular API notification
                              onMarkAsRead(notif.notification_id);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {!notif.is_read ? (
                            <svg
                              className="flex-shrink-0 self-center"
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="5" cy="5" r="5" fill="#0B8C00" />
                            </svg>
                          ) : (
                            <div className="w-[10px] h-[10px] flex-shrink-0"></div>
                          )}
                          <span className="text-[14px] leading-[150%] text-[#344054] truncate">
                            {notif.message}
                          </span>
                        </div>
                        <span className="text-[12px] leading-[150%] text-[#C0C0C0] ml-2 flex-shrink-0 whitespace-nowrap">
                          {formatTimeAgo(notif.created_date)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {groupedNotifications.thisWeek.length > 0 && (
              <>
                <h5 className="text-[16px] font-semibold leading-[150%] text-[#0B8C00] px-6 py-2 mt-2">
                  This week
                </h5>
                <ul className="border-b border-[#EAECF0] pb-2">
                  {groupedNotifications.thisWeek.map((notif) => (
                    <li key={notif.notification_id}>
                      <button
                        type="button"
                        className={`flex items-center justify-between w-full py-1.5 px-6 hover:bg-[#F9FAFB] transition-colors ${
                          !notif.is_read ? "font-semibold" : "font-normal"
                        }`}
                        onClick={() => {
                          if (!notif.is_read) {
                            // Check if it's a contact change request notification
                            if ((notif as any).contactChangeId) {
                              onMarkContactChangeRequestNotificationAsRead((notif as any).contactChangeId);
                            } else if ((notif as any).duplicateId) {
                              // Check if it's a duplicate number notification
                              onMarkDuplicateNumberNotificationAsRead((notif as any).duplicateId);
                            } else {
                              // Regular API notification
                              onMarkAsRead(notif.notification_id);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {!notif.is_read ? (
                            <svg
                              className="flex-shrink-0 self-center"
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="5" cy="5" r="5" fill="#0B8C00" />
                            </svg>
                          ) : (
                            <div className="w-[10px] h-[10px] flex-shrink-0"></div>
                          )}
                          <span className="text-[14px] leading-[150%] text-[#344054] truncate">
                            {notif.message}
                          </span>
                        </div>
                        <span className="text-[12px] leading-[150%] text-[#C0C0C0] ml-2 flex-shrink-0 whitespace-nowrap">
                          {formatTimeAgo(notif.created_date)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {groupedNotifications.thisMonth.length > 0 && (
              <>
                <h5 className="text-[16px] font-semibold leading-[150%] text-[#0B8C00] px-6 py-2 mt-2">
                  This month
                </h5>
                <ul className="border-b border-[#EAECF0] pb-2">
                  {groupedNotifications.thisMonth.map((notif) => (
                    <li key={notif.notification_id}>
                      <button
                        type="button"
                        className={`flex items-center justify-between w-full py-1.5 px-6 hover:bg-[#F9FAFB] transition-colors ${
                          !notif.is_read ? "font-semibold" : "font-normal"
                        }`}
                        onClick={() => {
                          if (!notif.is_read) {
                            // Check if it's a contact change request notification
                            if ((notif as any).contactChangeId) {
                              onMarkContactChangeRequestNotificationAsRead((notif as any).contactChangeId);
                            } else if ((notif as any).duplicateId) {
                              // Check if it's a duplicate number notification
                              onMarkDuplicateNumberNotificationAsRead((notif as any).duplicateId);
                            } else {
                              // Regular API notification
                              onMarkAsRead(notif.notification_id);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {!notif.is_read ? (
                            <svg
                              className="flex-shrink-0 self-center"
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="5" cy="5" r="5" fill="#0B8C00" />
                            </svg>
                          ) : (
                            <div className="w-[10px] h-[10px] flex-shrink-0"></div>
                          )}
                          <span className="text-[14px] leading-[150%] text-[#344054] truncate">
                            {notif.message}
                          </span>
                        </div>
                        <span className="text-[12px] leading-[150%] text-[#C0C0C0] ml-2 flex-shrink-0 whitespace-nowrap">
                          {formatTimeAgo(notif.created_date)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {groupedNotifications.thisYear.length > 0 && (
              <>
                <h5 className="text-[16px] font-semibold leading-[150%] text-[#0B8C00] px-6 py-2 mt-2">
                  This year
                </h5>
                <ul className="border-b border-[#EAECF0] pb-2">
                  {groupedNotifications.thisYear.map((notif) => (
                    <li key={notif.notification_id}>
                      <button
                        type="button"
                        className={`flex items-center justify-between w-full py-1.5 px-6 hover:bg-[#F9FAFB] transition-colors ${
                          !notif.is_read ? "font-semibold" : "font-normal"
                        }`}
                        onClick={() => {
                          if (!notif.is_read) {
                            // Check if it's a contact change request notification
                            if ((notif as any).contactChangeId) {
                              onMarkContactChangeRequestNotificationAsRead((notif as any).contactChangeId);
                            } else if ((notif as any).duplicateId) {
                              // Check if it's a duplicate number notification
                              onMarkDuplicateNumberNotificationAsRead((notif as any).duplicateId);
                            } else {
                              // Regular API notification
                              onMarkAsRead(notif.notification_id);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {!notif.is_read ? (
                            <svg
                              className="flex-shrink-0 self-center"
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <circle cx="5" cy="5" r="5" fill="#0B8C00" />
                            </svg>
                          ) : (
                            <div className="w-[10px] h-[10px] flex-shrink-0"></div>
                          )}
                          <span className="text-[14px] leading-[150%] text-[#344054] truncate">
                            {notif.message}
                          </span>
                        </div>
                        <span className="text-[12px] leading-[150%] text-[#C0C0C0] ml-2 flex-shrink-0 whitespace-nowrap">
                          {formatTimeAgo(notif.created_date)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </ScrollableContainer>

      {isFetching && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-[#0B8C00]"></div>
        </div>
      )}

      {!isFetching && allNotifications.length > 0 && notificationList.length >= totalCount && (
        <div className="flex justify-center border-t border-[#EAECF0] px-4 py-2">
          <div className="font-bold cursor-pointer text-sm text-[#C0C0C0]">The End</div>
        </div>
      )}
    </div>
  );
}
