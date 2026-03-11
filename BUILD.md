# Building the Windows exe

1. Install dependencies: `npm install`
2. Close the app if it is running (so the `release` folder is not locked).
3. Build: `npm run build:win`

If the build fails with **"Cannot create symbolic link"** when extracting winCodeSign (e.g. `libcrypto.dylib` / `libssl.dylib`), Windows is blocking creation of symlinks. Do one of the following:

- **Option A (recommended):** Run the build with administrator rights:
  1. Open PowerShell **as Administrator** (right‑click → Run as administrator).
  2. `cd` to the project folder.
  3. Run `npm run build:win`.

- **Option B:** Enable Developer Mode in Windows (Settings → Update & Security → For developers → Developer Mode). That allows creating symlinks without admin.

- **Option C (no admin, no Developer Mode):** Use the ZIP instead of the 7z that electron-builder downloads:
  1. Download the source ZIP: [winCodeSign-2.6.0](https://github.com/electron-userland/electron-builder-binaries/releases/tag/winCodeSign-2.6.0) (click "Source code (zip)").
  2. Unzip it. Go into `electron-builder-binaries-winCodeSign-2.6.0\winCodeSign`.
  3. Create folder `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0` (e.g. `C:\Users\<You>\AppData\Local\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`).
  4. Copy all contents from step 2 into that folder. If Windows asks for elevated rights for symlinks, choose "Skip" for those items.
  5. Run `npm run build:win` again; electron-builder will use the cache and skip the failing 7z extraction.

After a successful build you get:

- **Installer:** `release\Desktop Google Calendar Setup x.x.x.exe` (NSIS)
- **Unpacked app:** `release\win-unpacked\Desktop Google Calendar.exe` (run without installing)
