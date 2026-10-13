import type { ReactNode } from 'react';

/**
 * The web build is a design preview only: expo-sqlite on web is still alpha and needs extra
 * hosting headers, so screens there run without the database.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
