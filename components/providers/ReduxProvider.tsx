/**
 * Redux Provider
 * Purpose: Wraps app with Redux store and Redux Persist
 */

"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store";
import { AuthSessionRefresh } from "@/components/providers/AuthSessionRefresh";
import { TokenRefreshProvider } from "@/components/providers/TokenRefreshProvider";

interface ReduxProviderProps {
  children: React.ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthSessionRefresh />
        <TokenRefreshProvider />
        {children}
      </PersistGate>
    </Provider>
  );
}

