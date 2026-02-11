/**
 * Public API
 * Purpose: Public endpoints that don't require authentication (Countries, States, etc.)
 */

import { baseApi } from "./baseApi";

interface Country {
  id: number;
  name: string;
  iso3: string;
  iso2: string;
  phonecode: string;
  currency: string;
  currencySymbol: string;
}

interface CountriesResponse {
  success: boolean;
  data: Country[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetCountriesParams {
  search?: string;
}

interface State {
  id: number;
  name: string;
  countryId?: number;
  country_code?: string;
  [key: string]: unknown; // Allow for additional properties
}

interface StatesResponse {
  success: boolean;
  data: State[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetStatesParams {
  search?: string;
  countryId?: number | string;
}

interface City {
  id: number;
  name: string;
  stateId: number;
  countryId?: number;
  [key: string]: unknown; // Allow for additional properties
}

interface CitiesResponse {
  success: boolean;
  data: City[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetCitiesParams {
  search?: string;
  stateId?: number | string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetUsersParams {
  search?: string;
}

interface PincodeDataItem {
  pincode: number;
  area_id: number;
  area: string;
  tehsil_id: number;
  tehsil: string;
  district_id: number;
  district: string;
  state_id: number;
  state: string;
  country_id: number;
  country: string;
  tehsils?: Array<{
    id: number;
    name: string;
  }>;
  [key: string]: unknown;
}

interface PincodeResponse {
  success: boolean;
  data: PincodeDataItem | PincodeDataItem[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface Tehsil {
  id: number;
  name: string;
  districtId?: number;
  [key: string]: unknown;
}

interface TehsilsResponse {
  success: boolean;
  data: Tehsil[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetTehsilsParams {
  search?: string;
  districtId?: number | string;
  pincode?: number | string;
}

interface Area {
  id: number;
  name: string;
  tehsilId?: number;
  [key: string]: unknown;
}

interface AreasResponse {
  success: boolean;
  data: Area[];
  message: string;
  timestamp: string;
  statusCode: number;
}

interface GetAreasParams {
  search?: string;
  tehsilId?: number | string;
  pincode?: number | string;
}

export const publicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCountries: builder.query<CountriesResponse, GetCountriesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return {
          url: `/public/countries${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
    }),
    getStates: builder.query<StatesResponse, GetStatesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.countryId) queryParams.append("countryId", params.countryId.toString());

        const queryString = queryParams.toString();
        return {
          url: `/public/states${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
    }),
    getCities: builder.query<CitiesResponse, GetCitiesParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.stateId) queryParams.append("stateId", params.stateId.toString());

        const queryString = queryParams.toString();
        return {
          url: `/public/cities${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
    }),
    getPincode: builder.query<PincodeResponse, string>({
      query: (pincode) => ({
        url: `/public/pincode/${pincode}`,
        method: "GET",
      }),
    }),
    getTehsils: builder.query<TehsilsResponse, GetTehsilsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.districtId) queryParams.append("districtId", params.districtId.toString());
        if (params?.pincode) queryParams.append("pincode", params.pincode.toString());

        const queryString = queryParams.toString();
        return {
          url: `/public/tehsils${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
    }),
    getAreas: builder.query<AreasResponse, GetAreasParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.tehsilId) queryParams.append("tehsilId", params.tehsilId.toString());
        if (params?.pincode) queryParams.append("pincode", params.pincode.toString());

        const queryString = queryParams.toString();
        return {
          url: `/public/areas${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
    }),
    getUsers: builder.query<UsersResponse, GetUsersParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);

        const queryString = queryParams.toString();
        return {
          url: `/admin/settings/users${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
    }),
  }),
});


export const {
  useGetCountriesQuery,
  useGetStatesQuery,
  useGetCitiesQuery,
  useGetTehsilsQuery,
  useGetAreasQuery,
  useGetUsersQuery,
  useLazyGetCountriesQuery,
  useLazyGetStatesQuery,
  useLazyGetCitiesQuery,
  useLazyGetTehsilsQuery,
  useLazyGetAreasQuery,
  useLazyGetUsersQuery,
  useLazyGetPincodeQuery,
} = publicApi;

