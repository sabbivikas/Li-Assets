import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const SUPPORTER_ENTITLEMENT = "supporter";

function pickApiKey(): string | null {
  // In a production native build, prefer the platform-specific store key so
  // that builds without a test key still configure RevenueCat correctly.
  if (!__DEV__ && Constants.executionEnvironment !== "storeClient") {
    if (Platform.OS === "ios" && REVENUECAT_IOS_API_KEY) {
      return REVENUECAT_IOS_API_KEY;
    }
    if (Platform.OS === "android" && REVENUECAT_ANDROID_API_KEY) {
      return REVENUECAT_ANDROID_API_KEY;
    }
  }
  // Dev / Expo Go / web fall back to the test-store key.
  if (REVENUECAT_TEST_API_KEY) return REVENUECAT_TEST_API_KEY;
  // Last-resort: any platform key we have, so prod still works without test key.
  if (Platform.OS === "ios" && REVENUECAT_IOS_API_KEY) return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android" && REVENUECAT_ANDROID_API_KEY) {
    return REVENUECAT_ANDROID_API_KEY;
  }
  return null;
}

let initialized = false;
let initError: string | null = null;

export function initializeRevenueCat(): void {
  if (initialized) return;
  const apiKey = pickApiKey();
  if (!apiKey) {
    initError = "RevenueCat public API keys not configured.";
    return;
  }
  try {
    Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.WARN : Purchases.LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    initialized = true;
  } catch (e) {
    initError = e instanceof Error ? e.message : "RevenueCat init failed";
  }
}

interface SupporterContextValue {
  ready: boolean;
  available: boolean;
  isSupporter: boolean;
  customerInfo: CustomerInfo | null | undefined;
  offering: PurchasesOffering | null;
  monthlyPackage: PurchasesPackage | null;
  yearlyPackage: PurchasesPackage | null;
  isPurchasing: boolean;
  isRestoring: boolean;
  purchase: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  restore: () => Promise<CustomerInfo>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SupporterContextValue | null>(null);

const DEFAULT_SUPPORTER_CTX: SupporterContextValue = {
  ready: false,
  available: false,
  isSupporter: false,
  customerInfo: null,
  offering: null,
  monthlyPackage: null,
  yearlyPackage: null,
  isPurchasing: false,
  isRestoring: false,
  purchase: async () => {
    throw new Error("RevenueCat is not available outside SupporterProvider");
  },
  restore: async () => {
    throw new Error("RevenueCat is not available outside SupporterProvider");
  },
  refresh: async () => {},
};

export function SupporterProvider({
  userId,
  children,
}: {
  userId: string | null | undefined;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const available = initialized && !initError;

  // Identify customer with stable Clerk user id so server can verify entitlement.
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    (async () => {
      try {
        if (userId) {
          await Purchases.logIn(userId);
        } else {
          await Purchases.logOut().catch(() => {
            /* not logged in */
          });
        }
      } catch {
        // identifying is best-effort; purchases still work as anonymous
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ["rc"] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, userId, queryClient]);

  const customerInfoQuery = useQuery({
    queryKey: ["rc", "customer-info"],
    queryFn: async () => Purchases.getCustomerInfo(),
    enabled: available,
    staleTime: 60_000,
  });

  const offeringsQuery = useQuery<PurchasesOfferings>({
    queryKey: ["rc", "offerings"],
    queryFn: async () => Purchases.getOfferings(),
    enabled: available,
    staleTime: 5 * 60_000,
  });

  // Subscribe to customer-info updates so isSupporter flips immediately.
  useEffect(() => {
    if (!available) return;
    const listener = (info: CustomerInfo) => {
      queryClient.setQueryData(["rc", "customer-info"], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch {
        /* ignore */
      }
    };
  }, [available, queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: (info) => {
      queryClient.setQueryData(["rc", "customer-info"], info);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: (info) => {
      queryClient.setQueryData(["rc", "customer-info"], info);
    },
  });

  const offering = offeringsQuery.data?.current ?? null;
  const monthlyPackage = offering?.monthly ?? null;
  const yearlyPackage = offering?.annual ?? null;

  const isSupporter =
    customerInfoQuery.data?.entitlements.active?.[SUPPORTER_ENTITLEMENT] !== undefined;

  const value = useMemo<SupporterContextValue>(
    () => ({
      ready: !customerInfoQuery.isLoading && !offeringsQuery.isLoading,
      available,
      isSupporter,
      customerInfo: customerInfoQuery.data,
      offering,
      monthlyPackage,
      yearlyPackage,
      isPurchasing: purchaseMutation.isPending,
      isRestoring: restoreMutation.isPending,
      purchase: (pkg) => purchaseMutation.mutateAsync(pkg),
      restore: () => restoreMutation.mutateAsync(),
      refresh: async () => {
        await customerInfoQuery.refetch();
      },
    }),
    [
      available,
      customerInfoQuery,
      offering,
      offeringsQuery.isLoading,
      isSupporter,
      monthlyPackage,
      purchaseMutation,
      restoreMutation,
      yearlyPackage,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Returns supporter state. Outside the SupporterProvider (e.g., during the
 * sign-in flow before the provider mounts) we return a safe default that
 * reports the user as not a supporter and exposes no-op purchase actions.
 * This avoids try/catch defensive patterns at every call site.
 */
export function useSupporter(): SupporterContextValue {
  const ctx = useContext(Ctx);
  return ctx ?? DEFAULT_SUPPORTER_CTX;
}
