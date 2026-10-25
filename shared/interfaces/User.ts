interface BaseUser {
  id: number;
  firstName: string;
  lastName: string;
  image62?: string;
  image124?: string;
}

/** A calendar feed's address, for subscribing (webcal) and for adding by address (https) */
export interface CalendarUrls {
  https: string;
  webcal: string;
}

export default interface UserInfo extends BaseUser {
  sessionCount: number;
  calendarUrls?: CalendarUrls;
}

export interface UserCache extends BaseUser {
  sessions: string[];
  calendarSession?: string;
}

export function userCacheToUserInfo(user: UserCache): UserInfo {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    image62: user.image62,
    image124: user.image124,
    sessionCount: user.sessions.length + (user.calendarSession ? 1 : 0),
  };
}
