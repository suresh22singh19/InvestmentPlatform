/**
 * Redux Store
 * Purpose: Main Redux store with Redux Persist configuration
 */

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import medicineReducer from "./slices/medicineSlice";
import { baseApi } from "./api/baseApi";
import { authRefreshApi } from "./api/authRefreshApi";
import "./api/doctorApi";
import "./api/nurseApi";
import "./api/v3OldHiimsApis";
import "./api/settingHealthCardApi";

import { logoutJatayu } from "./api/jatayuApi";

// Redux Persist config - only persist auth slice
const persistConfig = {
  key: "root",
  version: 1,
  storage,
  whitelist: ["auth"],
};

const rootReducer = combineReducers({
  auth: authReducer,
  medicine: medicineReducer,
  [baseApi.reducerPath]: baseApi.reducer,
  [authRefreshApi.reducerPath]: authRefreshApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const jatayuLogoutMiddleware = () => (next: any) => (action: any) => {
  if (action.type === "auth/logout") {
    logoutJatayu().catch((err) => {
      console.error("Jatayu logout failed in middleware:", err);
    });
  }
  return next(action);
};

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware, authRefreshApi.middleware, jatayuLogoutMiddleware),
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

