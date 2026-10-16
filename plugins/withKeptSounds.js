// Keeps Daybloom's reminder sounds in release builds. Notification channels name their sound by
// file (res/raw/<name>), which the resource shrinker can't see, so without this rule it removes every
// sound but one and those reminders fall back to the phone's default sound.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/** @param {import('expo/config-plugins').ExpoConfig} config @param {{ sounds: string[] }} options */
module.exports = function withKeptSounds(config, { sounds }) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const raw = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'raw');
      fs.mkdirSync(raw, { recursive: true });
      const keep = sounds.map((s) => `@raw/${s}`).join(',');
      fs.writeFileSync(
        path.join(raw, 'keep_reminder_sounds.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="${keep}" />\n`,
      );
      return cfg;
    },
  ]);
};
