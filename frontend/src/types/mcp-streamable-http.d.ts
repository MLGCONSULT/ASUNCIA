/**
 * Déclaration du sous-module SDK MCP streamable HTTP (non ré-exporté par client/index).
 * Permet d'importer StreamableHTTPClientTransport depuis le chemin public du package.
 */
declare module "@modelcontextprotocol/sdk/client/streamableHttp" {
  export interface StreamableHTTPClientTransportOptions {
    requestInit?: RequestInit;
  }
  export class StreamableHTTPClientTransport {
    constructor(url: URL, opts?: StreamableHTTPClientTransportOptions);
    close(): Promise<void>;
  }
}
