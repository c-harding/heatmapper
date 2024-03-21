import type TimeRange from './TimeRange';

export default interface RequestMessage {
  handshake?: true;
  activities?: TimeRange[];
  routes?: boolean;

  /** @deprecated maps are now sent with the request */
  maps?: string[];

  gear?: string;
}
