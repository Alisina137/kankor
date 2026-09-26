# Preview APK + EAS Update workflow

This is the preferred physical-phone testing workflow for KankorPrep.

## Goal

Install the Android preview APK once. For normal JavaScript, TypeScript, React Native UI, styles, assets, navigation, and business-logic changes, publish an EAS Update instead of rebuilding the APK.

A new APK is still required after native-runtime changes such as adding/removing native modules, changing native permissions/plugins, upgrading Expo/React Native, or changing other incompatible native configuration.

## One-time setup

1. Install dependencies. The repository pins `eas-cli` locally, so later EAS commands do not dynamically download the CLI:

```powershell
npm install
```

2. Sign in to Expo/EAS if needed, then run the automated linker:

```powershell
npm run eas:link
```

It creates or links `@alisina137/kankorprep-afghanistan`, captures the returned EAS project ID, and writes both `expo.extra.eas.projectId` and the matching `expo.updates.url` into `apps/mobile/app.json`. The repository already owns the `appVersion` runtime policy and the preview/production update channels.

3. The preview build must use a stable public HTTPS Kankor API. First inspect the current preview variables:

```powershell
npm run eas:preview:env:list
```

Then configure the stable API URL:

```powershell
npm run eas:preview:env:set-api -- https://YOUR-STABLE-API.example.com
```

The helper uses the repository's pinned local EAS CLI, sets both `EXPO_PUBLIC_API_URL` and `KANKOR_PREVIEW_BUILD=true`, and rejects localhost/private-LAN URLs.

4. Verify the EAS Update linkage:

```powershell
npm run verify:eas-update
```

5. Build the preview APK once:

```powershell
npm run build:android:preview
```

Download the resulting APK from EAS and install it on the phone.

## Normal update workflow

After changing JavaScript/TypeScript/React Native code:

```powershell
npm run update:preview -- --message "Describe the change"
```

The update is published to the `preview` channel using the EAS `preview` environment, so the same stable `EXPO_PUBLIC_API_URL` is embedded in both the original APK and later OTA updates.

The repository command uses a guarded launcher that also forces `KANKOR_PREVIEW_BUILD=true`. This means a preview update fails fast if the EAS preview environment does not provide a non-local HTTPS `EXPO_PUBLIC_API_URL`; it cannot silently fall back to the laptop's local `.env`.

The preview APK checks for updates when it starts. It waits up to five seconds during preview startup for a new update. If the update does not apply on the first launch because the download takes longer, close and reopen the app once more.

## When an APK rebuild is required

Rebuild the preview APK after native-runtime changes, including:

- installing/removing a package with native code;
- changing Expo config plugins or native permissions;
- upgrading Expo SDK or React Native;
- changing native Android/iOS configuration that the existing binary does not contain.

With the `appVersion` runtime policy, bump the app version whenever the native runtime changes before creating the replacement APK.

## Production

Production builds use the `production` channel and `production` EAS environment. Publish production OTA updates only through:

```powershell
npm run update:production -- --message "Describe the production update"
```

Do not publish development-only API URLs to the production channel.
