interface BaseUser {
  id: number;
  firstName: string;
  lastName: string;
  image62?: string;
  image124?: string;
}

export default interface UserInfo extends BaseUser {
  sessionCount: number;
}

export interface UserCache extends BaseUser {
  sessions: string[];
  calendarLink?: string;
}

export function userCacheToUserInfo(user: UserCache): UserInfo {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    image62: user.image62,
    image124: user.image124,
    sessionCount: user.sessions.length,
  };
}
