import { countActivities, countRoutes } from '@/utils/strings';

import { type LoadingStats } from '../services/ActivityService';

export function loadingStatus(stats: LoadingStats, useRoutes = false) {
  const {
    cleared = false,
    closed = false,
    inCache = false,
    finding: { started = false, finished = false, length = 0 } = {},
  } = stats;

  const countItems = useRoutes ? countRoutes : countActivities;
  if (cleared) return `Cleared cache`;
  if (finished && inCache) return `Found ${countItems(length)} in cache`;
  if (finished || closed) return `Found ${countItems(length)}`;
  if (length) return `Found ${countItems(length)} so far`;
  if (started) return `Finding ${countItems(null)}`;
  return '';
}
