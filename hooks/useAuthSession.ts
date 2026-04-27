"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout as logoutAction, selectUser } from "@/store/slices/authSlice";

/**
 * Shell auth: prefer Redux user (set on login, restored by redux-persist) so the first
 * paint after navigation from `/` is not `user === null` while localStorage already
 * has data — that caused blank shell / redirect races vs `setCredentials`.
 */
export const useAuthSession = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (user) return;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        : null;
    if (!token) {
      router.replace("/");
    }
  }, [user, router]);

  const logout = () => {
    dispatch(logoutAction());
    router.replace("/");
  };

  return { user, logout };
};
