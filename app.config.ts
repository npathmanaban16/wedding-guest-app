import { ExpoConfig, ConfigContext } from 'expo/config';

// Build variants:
//   APP_VARIANT=nn    → "Neha & Naveen" (live wedding, existing App Store submission)
//   APP_VARIANT=saas  → "Tetherly" (multi-tenant public app, separate bundle)
//
// Single source of truth for per-variant config. Screens stay single-path —
// runtime values they need (Supabase creds, etc.) are read from
// Constants.expoConfig.extra rather than branching on the variant name.
type Variant = 'nn' | 'saas';

const variant: Variant = (process.env.APP_VARIANT === 'saas' ? 'saas' : 'nn');

interface VariantConfig {
  name: string;
  // Expo slug. Must be unique per EAS project — if both variants share a
  // slug, `eas init` matches the existing project and you can't create a
  // separate one for SaaS.
  slug: string;
  bundleIdentifier: string;
  androidPackage: string;
  icon: string;
  favicon: string;
  scheme: string;
  webName: string;
  webShortName: string;
  usageDescriptionSubject: string;
  supabaseUrl: string;
  supabaseKey: string;
  // Fixed wedding id baked into the build. Null means the app must resolve
  // the wedding at runtime (e.g. from an invite code) — SaaS path, not yet
  // wired up end-to-end.
  defaultWeddingId: string | null;
  easProjectId: string | undefined;
  updatesUrl: string | undefined;
  googleServicesFile: string | undefined;
}

const variants: Record<Variant, VariantConfig> = {
  nn: {
    name: 'Neha & Naveen',
    slug: 'wedding-guest-app',
    bundleIdentifier: 'com.nehanaveen.weddingapp',
    androidPackage: 'com.nehanaveen.weddingapp',
    icon: './assets/images/icon.png',
    favicon: './public/favicon.png',
    scheme: 'wedding-guest-app',
    webName: "Neha & Naveen's Wedding",
    webShortName: 'N & N Wedding',
    usageDescriptionSubject: 'Neha & Naveen Wedding App',
    supabaseUrl: 'https://suranxrcuqguwzwfowye.supabase.co',
    supabaseKey: 'sb_publishable_xrZgt_EivSAAdUoKAf6BmQ_Hg-2T1bw',
    defaultWeddingId: '00000000-0000-0000-0000-000000000001',
    easProjectId: 'ae93c50e-f645-405a-818e-2737f5560e96',
    updatesUrl: 'https://u.expo.dev/ae93c50e-f645-405a-818e-2737f5560e96',
    googleServicesFile: undefined,
  },
  saas: {
    name: 'Tetherly',
    slug: 'tetherly',
    bundleIdentifier: 'com.npathmanaban.tetherly',
    androidPackage: 'com.npathmanaban.tetherly',
    icon: './assets/images/tetherly_icon.png',
    favicon: './assets/images/tetherly_icon.png',
    scheme: 'tetherly',
    webName: 'Tetherly',
    webShortName: 'Tetherly',
    usageDescriptionSubject: 'Tetherly',
    supabaseUrl: 'https://anezjniflzoxfzxyctja.supabase.co',
    supabaseKey: 'sb_publishable_4uSK3ecrM5RBce-3aDh_cw_2YjutNTQ',
    defaultWeddingId: null,
    // EAS project created via `APP_VARIANT=saas eas init` against the
    // 'tetherly' slug. Re-run `eas init` if you ever recreate it.
    easProjectId: '54915c3a-5195-493a-b080-3544c9e1782a',
    updatesUrl: 'https://u.expo.dev/54915c3a-5195-493a-b080-3544c9e1782a',
    // Path to google-services.json. The file is gitignored, so on EAS
    // builds it's supplied via the GOOGLE_SERVICES_JSON file env var
    // (uploaded once via `eas env:create`). Locally, the file sits at
    // the repo root for `expo prebuild` and dev workflows.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const v = variants[variant];

  return {
    ...config,
    // Expo/EAS account that owns both variants' EAS projects.
    owner: 'npathmanaban',
    name: v.name,
    slug: v.slug,
    version: '2.3.0',
    runtimeVersion: { policy: 'appVersion' },
    ...(v.updatesUrl ? { updates: { url: v.updatesUrl } } : {}),
    orientation: 'portrait',
    scheme: v.scheme,
    icon: v.icon,
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: false,
      bundleIdentifier: v.bundleIdentifier,
      infoPlist: {
        NSPhotoLibraryUsageDescription:       `Allow ${v.usageDescriptionSubject} to access your photos to share memories.`,
        NSCameraUsageDescription:             `Allow ${v.usageDescriptionSubject} to use your camera to capture memories.`,
        NSPhotoLibraryAddUsageDescription:    `Allow ${v.usageDescriptionSubject} to save photos.`,
        NSUserNotificationsUsageDescription:  `Allow ${v.usageDescriptionSubject} to send you wedding updates and reminders.`,
        NSCalendarsFullAccessUsageDescription: `Allow ${v.usageDescriptionSubject} to add wedding events to your calendar.`,
        // Declares the app does not use non-exempt encryption, so App Store
        // submissions don't prompt the export-compliance questionnaire.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: v.androidPackage,
      adaptiveIcon: {
        foregroundImage: v.icon,
        backgroundColor: '#FAF7F4',
      },
      ...(v.googleServicesFile ? { googleServicesFile: v.googleServicesFile } : {}),
      permissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.CAMERA',
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR',
        'android.permission.RECORD_AUDIO',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: v.favicon,
      name: v.webName,
      shortName: v.webShortName,
      themeColor: '#8B5E6B',
      backgroundColor: '#FAF7F4',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-calendar',
      [
        'expo-image-picker',
        {
          photosPermission: `Allow ${v.usageDescriptionSubject} to access your photos.`,
          cameraPermission: `Allow ${v.usageDescriptionSubject} to use your camera.`,
        },
      ],
      [
        'expo-notifications',
        {
          icon: v.icon,
          color: '#8B5E6B',
          iosDisplayInForeground: true,
        },
      ],
    ],
    experiments: { typedRoutes: true },
    extra: {
      variant,
      supabaseUrl: v.supabaseUrl,
      supabaseKey: v.supabaseKey,
      defaultWeddingId: v.defaultWeddingId,
      router: {},
      ...(v.easProjectId ? { eas: { projectId: v.easProjectId } } : {}),
    },
  };
};
