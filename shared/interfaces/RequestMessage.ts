import type TimeRange from './TimeRange';

export default interface RequestMessage {
  version?: true;
  activities?: TimeRange[];
  routes?: true;
  maps?: string[];
  gear?: string;
}
