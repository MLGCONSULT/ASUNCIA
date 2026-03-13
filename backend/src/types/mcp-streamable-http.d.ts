declare module "@modelcontextprotocol/sdk/client/streamableHttp.js" {
  export interface StreamableHTTPClientTransportOptions {
    requestInit?: RequestInit;
  }
  export class StreamableHTTPClientTransport {
    constructor(url: URL, opts?: StreamableHTTPClientTransportOptions);
    close(): Promise<void>;
  }
}
