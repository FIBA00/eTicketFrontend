# Build & Distribution

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Expo account (free): https://expo.dev

## Setup

```bash
# 1. Clone and install
cd eticket-mobile
npm install

# 2. Login to Expo
eas login

# 3. Configure project
eas init  # Creates project ID in app.json
```

## Development Build

```bash
# Start dev server
npm start

# Run on Android device (with Expo Go app)
npm run android

# Or scan QR code with Expo Go
```

## Release Build (APK)

### 1. Generate Keystore

```bash
keytool -genkey -v   -keystore eticket-release.keystore   -alias eticket   -keyalg RSA   -keysize 2048   -validity 10000
```

Enter passwords when prompted. **Keep this file safe** — losing it means you can't update the app.

### 2. Configure eas.json

Already configured in `eas.json`:

```json
{
  "build": {
    "release": {
      "android": {
        "buildType": "apk",
        "keystore": {
          "keystorePath": "./eticket-release.keystore",
          "keystorePassword": "process.env.KEYSTORE_PASSWORD",
          "keyAlias": "eticket",
          "keyPassword": "process.env.KEY_PASSWORD"
        }
      }
    }
  }
}
```

### 3. Set Environment Variables

```bash
export KEYSTORE_PASSWORD=your-keystore-password
export KEY_PASSWORD=your-key-password
```

Or create `.env` file (add to `.gitignore`):

```
KEYSTORE_PASSWORD=your-keystore-password
KEY_PASSWORD=your-key-password
EXPO_PUBLIC_API_URL=https://api.eticket.com/api/v1
```

### 4. Build

```bash
# Cloud build (recommended)
eas build --platform android --profile release

# Local build (requires Android SDK)
eas build --platform android --profile release --local
```

Build takes ~10-20 minutes. Output: `.apk` file.

### 5. Download APK

```bash
# List builds
eas build:list

# Download latest
eas build:download --platform android
```

## Distribution (No Play Store)

### Option 1: Direct Download

Host APK on your server:

```bash
# Upload to server
scp app-release.apk user@server:/var/www/eticket/downloads/

# Users download from:
# https://eticket.com/download/eticket.apk
```

### Option 2: QR Code

Generate QR code pointing to download URL:

```bash
# Install qrencode
sudo apt install qrencode

# Generate QR
qrencode -o download-qr.png "https://eticket.com/download/eticket.apk"
```

Print QR at stations. Users scan → download → install.

### Option 3: Firebase App Distribution (Recommended)

Free service for distributing apps to testers:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init appdistribution

# Upload
firebase appdistribution:distribute app-release.apk   --app YOUR_APP_ID   --testers "ticketer1@example.com,ticketer2@example.com"
```

Testers get email with download link. App checks for updates automatically.

## In-App Updates

Add version check to app:

```typescript
// On app launch
const latest = await fetch(`${API_URL}/app/latest-version`).then(r => r.json());
const current = Constants.expoConfig?.version;

if (latest.version !== current) {
  Alert.alert(
    "Update Available",
    `Version ${latest.version} is available`,
    [
      { text: "Later" },
      { 
        text: "Update", 
        onPress: () => Linking.openURL(latest.apkUrl)
      }
    ]
  );
}
```

Backend endpoint:

```typescript
// GET /api/v1/app/latest-version
app.get("/app/latest-version", (req, res) => {
  res.json({
    version: "1.0.1",
    apkUrl: "https://eticket.com/download/eticket-1.0.1.apk",
    forceUpdate: false,
  });
});
```

## Version Management

| File | What to Update |
|------|----------------|
| `app.json` | `version` (user-facing), `android.versionCode` (internal) |
| `package.json` | `version` |
| Backend | Latest version in `/app/latest-version` |

Increment `versionCode` for every release (Android requirement).

## Security Notes

1. **Keystore**: Keep `eticket-release.keystore` safe. Backup in multiple locations.
2. **Passwords**: Never commit keystore passwords to git.
3. **API URL**: Use `EXPO_PUBLIC_API_URL` env var, don't hardcode.
4. **HTTPS**: Always use HTTPS in production.

## Troubleshooting

### Build fails with keystore error
- Check keystore path in `eas.json`
- Verify passwords are correct
- Ensure keystore file exists

### App crashes on launch
- Check `adb logcat` for errors
- Verify API URL is reachable
- Check that all permissions are in `app.json`

### Sync not working
- Verify `expo-background-fetch` is configured
- Check battery optimization isn't killing app
- Ensure `ACCESS_NETWORK_STATE` permission is granted
