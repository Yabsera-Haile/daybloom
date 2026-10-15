// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_habit_reminder_repeats.sql';
import m0002 from './0002_budget_plans.sql';
import m0003 from './0003_drop_month_budgets.sql';
import m0004 from './0004_drafts.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  