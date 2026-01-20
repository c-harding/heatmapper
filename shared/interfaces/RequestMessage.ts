import type TimeRange from './TimeRange';

export default interface RequestMessage {
  handshake?: true;
  activities?: TimeRange[];
  routes?: boolean;

  gear?: string;
}
