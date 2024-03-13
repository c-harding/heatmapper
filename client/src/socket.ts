import {
  type RequestMessage,
  type ResponseMessage,
  type ResponseMessageOfType,
  type ResponseMessageType,
} from '@strava-heatmapper/shared/interfaces';

let socketID = 0;

type ResponseCallback<T extends ResponseMessageType> = (data: ResponseMessageOfType<T>) => void;

export default class Socket {
  readonly id = (socketID += 1);

  private errored = false;

  readonly url: string;

  private _connection?: Promise<WebSocket>;

  private verbose: boolean;

  private log(...args: unknown[]) {
    if (this.verbose) console.log(...args);
  }

  private promisedResponses: Partial<
    Record<ResponseMessageType, ((data: ResponseMessage) => void)[]>
  > = {};

  private get connection(): Promise<WebSocket> {
    return (this._connection ??= new Promise((resolve, reject) => {
      this.log('Socket', this.id, 'opening');
      const connection = new WebSocket(this.url);
      connection.onerror = () => {
        reject();
        this.errored = true;
      };
      connection.onopen = () => {
        this.log('Socket', this.id, 'opened to state', connection.readyState);
        resolve(connection);
      };
      connection.onmessage = (message: MessageEvent<string>) => {
        const data = JSON.parse(message.data) as ResponseMessage;
        const promisedResponse = this.promisedResponses[data.type]?.shift();
        if (promisedResponse) {
          promisedResponse(data);
        } else {
          this.messageHandler(data, this);
        }
      };
      connection.onclose = () => this.closedHandler(this.errored);
    }));
  }

  constructor(
    url: string,
    private messageHandler: (data: ResponseMessage, socket: Socket) => void,
    private closedHandler: (errored: boolean) => void,
    { verbose = false } = {},
  ) {
    this.url = url;
    this.verbose = verbose;
  }

  private async send(data: string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView) {
    const connection = await this.connection;
    this.log('Socket', this.id, 'is in state', connection.readyState);
    if (connection.readyState !== connection.OPEN)
      throw new Error(`Cannot send data, socket #${this.id} is in state ${connection.readyState}`);
    connection.send(data);
    this.log('Sent', data);
  }

  /** Send a request without waiting for a response */
  async sendRequest(message: RequestMessage): Promise<undefined>;

  /** Send a request and wait for the first response of the given type */
  async sendRequest<T extends ResponseMessageType>(
    message: RequestMessage,
    responseType: T,
  ): Promise<ResponseMessage & { type: T }>;

  async sendRequest<T extends ResponseMessageType>(
    message: RequestMessage,
    responseType?: T,
  ): Promise<ResponseMessageOfType<T> | undefined> {
    this.log('Socket', this.id, 'sending', message);
    let promise: Promise<ResponseMessage & { type: T }> | undefined;
    if (responseType) {
      promise = new Promise<ResponseMessageOfType<T>>((resolve) => {
        const promisedResponseQueue: ResponseCallback<T>[] = (this.promisedResponses[
          responseType
        ] ??= []);
        promisedResponseQueue.push(resolve);
      });
    }
    await this.send(JSON.stringify(message));
    return await promise;
  }

  async close(): Promise<void> {
    if (this._connection) (await this.connection).close();
  }
}
