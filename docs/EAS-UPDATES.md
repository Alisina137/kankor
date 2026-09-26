# Preview APK + EAS Update workflow

This is the preferred physical-phone testing workflow for KankorPrep.

## Goal

Install the Android preview APK once. For normal JavaScript, TypeScript, React Native UI, styles, assets, navigation, and business-logic changes, publish an EAS Update instead of rebuilding the APK.

A new APK is still required after native-runtime changes such as adding/removing native modules, changing native permissions/plugins, upgrading Expo/React Native, or changing other incompatible native configuration.

## One-time setup

1. Install dependencies:

```powershell
npm install
```

2. Sign in to Expo/EAS if needed, then link the Kankor app to the EAS project owned by `alisina137`:

```powershell
npm run eas:link
```

3. Configure EAS Update:

```powershell
npm run eas:update:configure
```

Because this project has dynamic `app.config.ts`, confirm that these values ultimately exist in `apps/mobile/app.json`:

- `expo.extra.eas.projectId`
- `expo.updates.url = https://u.expo.dev/<project-id>`
- `expo.runtimeVersion.policy = appVersion`

The repository already owns the runtime policy, preview/production channels, and update startup behavior. Do not replace them with a different runtime policy.

4. The preview build must use a stable public HTTPS Kankor API. Configure it in the EAS `preview` environment:

```powershell
cd C:\projects\kankor\apps\mobile
npx eas-cli env:set --name EXPO_PUBLIC_API_URL --value https://YOUR-STABLE-API.example.com --environment preview --visibility plaintext
npx eas-cli env:set --name KANKOR_PREVIEW_BUILD --value true --environment preview --visibility plaintext
cd C:\projects\kankor
```

Do not use localhost, a `10.x.x.x` LAN address, or another laptop-only address for the preview APK.

5. Verify the EAS Update linkage:

```powershell
npm run verify:eas-update
```

6. Build the preview APK once:

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
