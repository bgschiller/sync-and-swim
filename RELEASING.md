# Releasing

## How to publish a new version

1. **Bump the version** in `src-tauri/tauri.conf.json`
2. **Update `CHANGELOG.md`** with a new section summarizing the changes since the last release
3. **Commit** both changes
4. **Push to the `release` branch:**
   ```bash
   git push origin HEAD:release
   ```
5. This triggers [`.github/workflows/publish.yml`](.github/workflows/publish.yml) which:
   - Builds the Tauri app for macOS (ARM + Intel), Ubuntu, and Windows
   - Creates a **draft release** tagged `app-vX.Y.Z` (version pulled from `tauri.conf.json`)
6. Go to the [releases page](https://github.com/bgschiller/sync-and-swim/releases), review the draft, and click **Publish release**
