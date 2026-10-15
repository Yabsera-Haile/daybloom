# End-to-end tests (Maestro)

Real journeys through the installed app on the Android emulator (TEST_PLAN: End-to-end).
Each flow starts from a fresh install state (`clearState`) and skips onboarding.

Run them against a release build installed on the emulator (see README, "Install it on a phone"):

```bash
maestro test e2e/
```

Maestro: https://maestro.mobile.dev (needs Java 17).
