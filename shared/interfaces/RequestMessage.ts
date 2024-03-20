import type TimeRange from './TimeRange';

export default interface RequestMessage {
  version?: true;
  activities?: TimeRange[];
  routes?: true;

  /** @deprecated maps are now sent with the request */
  maps?: string[];

  gear?: string;
}
