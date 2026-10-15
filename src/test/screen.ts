// Helpers for screen tests (src/__tests__): the app reads the in-memory test database
// (withTestDb), and screens re-read after changes once refresh() is awaited.
import { act } from '@testing-library/react-native';

import { notifyDataChanged } from '@/data/live';

/** Lets screens re-read the database after a change, as the phone's change listener would. */
export async function refresh(): Promise<void> {
  await act(async () => {
    notifyDataChanged();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Route params for the screen under test (useLocalSearchParams). */
export function setParams(params: Record<string, string>): void {
  globalThis.__routeParams = params;
}

declare global {
  var __routeParams: Record<string, string> | undefined;
}
