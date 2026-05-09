import {
  type App,
  type CreateProductData,
  type Entitlement,
  type Offering,
  type Package,
  type Product,
  type Project,
  attachProductsToEntitlement,
  attachProductsToPackage,
  createApp,
  createEntitlement,
  createOffering,
  createPackages,
  createProduct,
  createProject,
  listAppPublicApiKeys,
  listApps,
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
  listProjects,
  updateOffering,
} from "@replit/revenuecat-sdk";

import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

const PROJECT_NAME = "Natura";

const APP_STORE_APP_NAME = "Natura iOS";
const APP_STORE_BUNDLE_ID = "com.natura.app";
const PLAY_STORE_APP_NAME = "Natura Android";
const PLAY_STORE_PACKAGE_NAME = "com.natura.app";

const ENTITLEMENT_IDENTIFIER = "supporter";
const ENTITLEMENT_DISPLAY_NAME = "Natura Supporter";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Support Natura";

interface PlanSpec {
  productIdentifier: string;
  playStoreProductIdentifier: string;
  displayName: string;
  userFacingTitle: string;
  duration: "P1M" | "P1Y";
  packageIdentifier: string;
  packageDisplayName: string;
  prices: { amount_micros: number; currency: string }[];
}

function dollarsToMicros(usd: number): number {
  return Math.round(usd * 1_000_000);
}

interface TierSpec {
  id: "supporter" | "sustainer" | "patron";
  label: string;
  monthlyUSD: number;
  yearlyUSD: number;
}

const TIERS: TierSpec[] = [
  { id: "supporter", label: "Supporter", monthlyUSD: 9.99, yearlyUSD: 99.99 },
  { id: "sustainer", label: "Sustainer", monthlyUSD: 19.99, yearlyUSD: 199.99 },
  { id: "patron", label: "Patron", monthlyUSD: 49.99, yearlyUSD: 499.99 },
];

const PLANS: PlanSpec[] = TIERS.flatMap((t) => [
  {
    productIdentifier: `${t.id}_monthly`,
    playStoreProductIdentifier: `${t.id}_monthly:monthly`,
    displayName: `Natura ${t.label} — Monthly`,
    userFacingTitle: `${t.label} (Monthly)`,
    duration: "P1M" as const,
    packageIdentifier: `${t.id}_monthly`,
    packageDisplayName: `${t.label} — Monthly`,
    prices: [{ amount_micros: dollarsToMicros(t.monthlyUSD), currency: "USD" }],
  },
  {
    productIdentifier: `${t.id}_yearly`,
    playStoreProductIdentifier: `${t.id}_yearly:yearly`,
    displayName: `Natura ${t.label} — Yearly`,
    userFacingTitle: `${t.label} (Yearly)`,
    duration: "P1Y" as const,
    packageIdentifier: `${t.id}_yearly`,
    packageDisplayName: `${t.label} — Yearly`,
    prices: [{ amount_micros: dollarsToMicros(t.yearlyUSD), currency: "USD" }],
  },
]);

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seed() {
  const client = await getUncachableRevenueCatClient();

  // 1. Project
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 50 },
  });
  if (listProjectsError) throw new Error("Failed to list projects: " + JSON.stringify(listProjectsError));
  if (!existingProjects) throw new Error("No project list returned");
  let project: Project | undefined = existingProjects.items?.find(
    (p) => p.name.toLowerCase() === PROJECT_NAME.toLowerCase(),
  );
  if (!project) {
    const { data, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error || !data) {
      throw new Error(
        "Failed to create project: " + JSON.stringify(error, null, 2),
      );
    }
    project = data;
    console.log("Created project:", project.id);
  } else {
    console.log("Project already exists:", project.id, "(", project.name, ")");
  }

  // 2. Apps (test store auto-created; create app store + play store)
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) {
    throw new Error("No apps found (expected at least a Test Store app)");
  }
  const testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  if (!testStoreApp) throw new Error("No Test Store app found");
  console.log("Test Store app:", testStoreApp.id);

  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  if (!appStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: APP_STORE_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (error || !data) throw new Error("Failed to create App Store app");
    appStoreApp = data;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");
  if (!playStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: "play_store",
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (error || !data) throw new Error("Failed to create Play Store app");
    playStoreApp = data;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // 3. Products (test/app/play for each plan)
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 200 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  async function ensureProduct(
    targetApp: App,
    label: string,
    plan: PlanSpec,
    productIdentifier: string,
    isTestStore: boolean,
  ): Promise<Product> {
    const existing = existingProducts?.items?.find(
      (p) => p.store_identifier === productIdentifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} product exists (${plan.duration}):`, existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: productIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: plan.displayName,
    };
    if (isTestStore) {
      body.subscription = { duration: plan.duration };
      body.title = plan.userFacingTitle;
    }
    const { data, error } = await createProduct({
      client,
      path: { project_id: project!.id },
      body,
    });
    if (error || !data) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product (${plan.duration}):`, data.id);
    return data;
  }

  const allProductIdsForEntitlement: string[] = [];
  const planProductMap = new Map<
    string,
    { test: Product; appStore: Product; playStore: Product }
  >();

  for (const plan of PLANS) {
    const testProd = await ensureProduct(
      testStoreApp,
      "Test Store",
      plan,
      plan.productIdentifier,
      true,
    );
    const appProd = await ensureProduct(
      appStoreApp,
      "App Store",
      plan,
      plan.productIdentifier,
      false,
    );
    const playProd = await ensureProduct(
      playStoreApp,
      "Play Store",
      plan,
      plan.playStoreProductIdentifier,
      false,
    );

    // Set test store price
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProd.id },
      body: { prices: plan.prices },
    });
    if (priceError) {
      const errType =
        priceError && typeof priceError === "object" && "type" in priceError
          ? (priceError as { type?: string }).type
          : undefined;
      if (errType === "resource_already_exists") {
        console.log(`Test store prices already set for ${plan.productIdentifier}`);
      } else {
        throw new Error(`Failed to set test store prices for ${plan.productIdentifier}`);
      }
    } else {
      console.log(`Set test store prices for ${plan.productIdentifier}`);
    }

    allProductIdsForEntitlement.push(testProd.id, appProd.id, playProd.id);
    planProductMap.set(plan.productIdentifier, {
      test: testProd,
      appStore: appProd,
      playStore: playProd,
    });
  }

  // 4. Entitlement
  const { data: existingEntitlements, error: listEntError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 50 },
  });
  if (listEntError) throw new Error("Failed to list entitlements");

  let entitlement: Entitlement | undefined = existingEntitlements.items?.find(
    (e) => e.lookup_key === ENTITLEMENT_IDENTIFIER,
  );
  if (!entitlement) {
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: ENTITLEMENT_IDENTIFIER,
        display_name: ENTITLEMENT_DISPLAY_NAME,
      },
    });
    if (error || !data) throw new Error("Failed to create entitlement");
    entitlement = data;
    console.log("Created entitlement:", entitlement.id);
  } else {
    console.log("Entitlement exists:", entitlement.id);
  }

  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIdsForEntitlement },
  });
  if (attachEntErr) {
    const errType =
      attachEntErr && typeof attachEntErr === "object" && "type" in attachEntErr
        ? (attachEntErr as { type?: string }).type
        : undefined;
    if (errType === "unprocessable_entity_error") {
      console.log("Entitlement product links already up to date");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached products to entitlement");
  }

  // 5. Offering
  const { data: existingOfferings, error: listOffErr } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 50 },
  });
  if (listOffErr) throw new Error("Failed to list offerings");
  let offering: Offering | undefined = existingOfferings.items?.find(
    (o) => o.lookup_key === OFFERING_IDENTIFIER,
  );
  if (!offering) {
    const { data, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: OFFERING_IDENTIFIER,
        display_name: OFFERING_DISPLAY_NAME,
      },
    });
    if (error || !data) throw new Error("Failed to create offering");
    offering = data;
    console.log("Created offering:", offering.id);
  } else {
    console.log("Offering exists:", offering.id);
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // 6. Packages
  const { data: existingPackages, error: listPkgErr } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 50 },
  });
  if (listPkgErr) throw new Error("Failed to list packages");

  for (const plan of PLANS) {
    let pkg: Package | undefined = existingPackages.items?.find(
      (p) => p.lookup_key === plan.packageIdentifier,
    );
    if (!pkg) {
      const { data, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: {
          lookup_key: plan.packageIdentifier,
          display_name: plan.packageDisplayName,
        },
      });
      if (error || !data) throw new Error(`Failed to create package ${plan.packageIdentifier}`);
      pkg = data;
      console.log(`Created package ${plan.packageIdentifier}:`, pkg.id);
    } else {
      console.log(`Package ${plan.packageIdentifier} exists:`, pkg.id);
    }

    const products = planProductMap.get(plan.productIdentifier)!;
    const { error: attachPkgErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: products.test.id, eligibility_criteria: "all" },
          { product_id: products.appStore.id, eligibility_criteria: "all" },
          { product_id: products.playStore.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgErr) {
      const errType =
        attachPkgErr && typeof attachPkgErr === "object" && "type" in attachPkgErr
          ? (attachPkgErr as { type?: string }).type
          : undefined;
      const errMsg =
        attachPkgErr && typeof attachPkgErr === "object" && "message" in attachPkgErr
          ? (attachPkgErr as { message?: string }).message
          : undefined;
      if (errType === "unprocessable_entity_error" && errMsg?.includes("Cannot attach product")) {
        console.log(`Skipping package attach for ${plan.packageIdentifier} (already has product)`);
      } else {
        throw new Error(`Failed to attach products to package ${plan.packageIdentifier}`);
      }
    } else {
      console.log(`Attached products to package ${plan.packageIdentifier}`);
    }
  }

  // 7. Public API keys
  const keys = await Promise.all(
    [testStoreApp, appStoreApp, playStoreApp].map((a) =>
      listAppPublicApiKeys({
        client,
        path: { project_id: project!.id, app_id: a.id },
      }),
    ),
  );
  const [testKeys, appKeys, playKeys] = keys;
  if (testKeys.error || appKeys.error || playKeys.error) {
    throw new Error("Failed to list public API keys");
  }

  console.log("\n========================================");
  console.log("Natura RevenueCat seed complete!");
  console.log("========================================");
  console.log("Set the following environment variables:");
  console.log("");
  console.log("REVENUECAT_PROJECT_ID =", project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID =", testStoreApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID =", appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID =", playStoreApp.id);
  console.log("");
  console.log(
    "EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =",
    testKeys.data?.items.map((i) => i.key).join(", ") ?? "N/A",
  );
  console.log(
    "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =",
    appKeys.data?.items.map((i) => i.key).join(", ") ?? "N/A",
  );
  console.log(
    "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =",
    playKeys.data?.items.map((i) => i.key).join(", ") ?? "N/A",
  );
  console.log("========================================\n");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
