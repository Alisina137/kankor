# Preview APK + EAS Update workflow

This is the physical-device workflow for KankorPrep.

## Goal

Build and install an Android preview APK once. After that, normal JavaScript, TypeScript, React Native UI, translations, styles, business logic, and compatible bundled asset changes are delivered with EAS Update. The installed APK remains the native base application; EAS Update downloads compatible JS/assets that run on top of that native build.

A new APK/AAB is required only when the native runtime changes.

## Existing project identity

Preserve the existing application identity:

- Expo name: `KankorPrep Afghanistan`
- Expo slug: `kankorprep-afghanistan`
- Expo owner: `alisina137`
- Android package: `com.kankorprep.afghanistan`
- existing EAS project and signing credentials

Do not create a second EAS project.

## Update configuration

The mobile workspace uses:

- Expo SDK 57
- `expo-updates ~57.0.23`
- runtime policy: `fingerprint`
- automatic update check: `ON_LOAD`
- `fallbackToCacheTimeout: 0`
- preview channel: `preview`
- production channel: `production`

The fingerprint runtime policy lets Expo derive compatibility from native dependencies/configuration so an OTA update is not loaded by an incompatible native build.

With the standard Expo startup behavior, the app can start from its embedded/cached update when offline. When online, it checks for a compatible update on load. If a new update finishes downloading after startup, it is used on a later app launch/reload.

## One-time EAS Update account setup

The repository already contains the EAS Update source configuration. The account-specific EAS project ID and update URL must point to the existing Expo project.

Run:

```powershell
npm run eas:update:configure
```

If Expo asks which project to use, link the existing `@alisina137/kankorprep-afghanistan` project. Do not create another project.

Then verify:

```powershell
npm run verify:eas-update
```

That verifier checks the existing project ID, `https://u.expo.dev/<project-id>` update URL, fingerprint runtime strategy, build channels, APK/AAB types, and update commands.

## First preview APK after this configuration

Because `expo-updates` and runtime configuration affect the native application, create one new preview APK after configuration:

```powershell
git pull origin main
npm install
npm run release:check
npm run verify:eas-update
npm run build:android:preview
```

Download the resulting APK from EAS and install it on the physical Android phone.

## Normal future preview updates

For a normal JS/TS/React Native change:

```powershell
npm run update:preview -- --message "Describe the update"
```

The command publishes only to the `preview` channel.

After publishing:

1. close the installed Android app;
2. reopen it while online;
3. allow the compatible update to download;
4. if the first reopen started before the download finished, close/reopen once more;
5. verify the visible change.

## OTA-compatible changes

These normally do not require a new APK/AAB:

- JavaScript
- TypeScript
- React components
- screens
- UI layout
- styles
- translations
- business logic
- calculations
- normal JS-side bug fixes
- most bundled images/assets that do not change native configuration

## Changes that require a new native build

Create a new APK/AAB when changing the native runtime, including:

- launcher icon/native app metadata
- Android package/application ID
- native permissions
- Expo SDK
- React Native
- adding/removing/updating native modules
- AndroidManifest/native configuration
- Expo config plugins/native plugins
- native splash resources/configuration
- any other change that alters the native fingerprint

With the fingerprint policy, a native-runtime change produces a different runtime fingerprint, preventing the old APK from loading an incompatible update.

## Production

Production native release:

```powershell
npm run build:android:production
```

Normal compatible production OTA update:

```powershell
npm run update:production -- --message "Describe the production update"
```

Preview updates target only `preview`. Production updates target only `production`. Never use the production channel for test updates.

## Verification commands

After pulling/installing dependencies, use the checks that apply to the current change:

```powershell
npm run verify:eas-update
npm --workspace @kankor/mobile run check:expo
npm run typecheck
npm run release:check
npx expo-doctor
cd apps/mobile
npx expo config --type public
```

Do not use destructive dependency commands such as `npm audit fix --force` as part of this workflow.
