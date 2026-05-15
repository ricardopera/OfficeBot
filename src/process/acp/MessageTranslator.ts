export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface AcpMessage {
  type: 'request' | 'response' | 'notification' | 'error';
  method?: string;
  id?: string | number;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: JsonRpcError;
}

export class MessageTranslator {
  private messageBuffer: string = '';
  private static readonly JSONRPC_VERSION = '2.0';

  translateFromJsonRpc(json: string): AcpMessage {
    try {
      const parsed = JSON.parse(json);

      if ('jsonrpc' in parsed && parsed.jsonrpc === MessageTranslator.JSONRPC_VERSION) {
        return this.convertRpcToAcp(parsed);
      }

      return this.parseAcpNative(parsed);
    } catch {
      return {
        type: 'error',
        error: {
          code: -32700,
          message: 'Parse error'
        }
      };
    }
  }

  private convertRpcToAcp(rpc: JsonRpcRequest | JsonRpcResponse): AcpMessage {
    if ('method' in rpc) {
      return {
        type: 'request',
        method: rpc.method,
        id: rpc.id ?? undefined,
        params: rpc.params
      };
    }

    if ('result' in rpc) {
      return {
        type: 'response',
        id: rpc.id ?? undefined,
        result: rpc.result
      };
    }

    if ('error' in rpc) {
      return {
        type: 'error',
        id: rpc.id ?? undefined,
        error: rpc.error
      };
    }

    return { type: 'error' };
  }

  private parseAcpNative(obj: Record<string, unknown>): AcpMessage {
    if (obj.type === 'notification') {
      return {
        type: 'notification',
        method: obj.method as string,
        params: obj.params as Record<string, unknown>
      };
    }

    return {
      type: 'request',
      method: obj.method as string,
      id: obj.id as string | number | undefined,
      params: obj.params as Record<string, unknown> | undefined
    };
  }

  toJsonRpc(message: AcpMessage): string {
    if (message.type === 'request') {
      const request: JsonRpcRequest = {
        jsonrpc: MessageTranslator.JSONRPC_VERSION,
        id: message.id ?? null,
        method: message.method!,
        params: message.params
      };
      return JSON.stringify(request);
    }

    if (message.type === 'response') {
      const response: JsonRpcResponse = {
        jsonrpc: MessageTranslator.JSONRPC_VERSION,
        id: message.id ?? null,
        result: message.result
      };
      return JSON.stringify(response);
    }

    if (message.type === 'error') {
      const response: JsonRpcResponse = {
        jsonrpc: MessageTranslator.JSONRPC_VERSION,
        id: message.id ?? null,
        error: message.error
      };
      return JSON.stringify(response);
    }

    return JSON.stringify(message);
  }

  appendStreamChunk(chunk: string): AcpMessage[] {
    this.messageBuffer += chunk;
    const messages: AcpMessage[] = [];
    let newlineIndex;

    while ((newlineIndex = this.messageBuffer.indexOf('\n')) !== -1) {
      const line = this.messageBuffer.slice(0, newlineIndex);
      this.messageBuffer = this.messageBuffer.slice(newlineIndex + 1);

      if (line.trim()) {
        messages.push(this.translateFromJsonRpc(line));
      }
    }

    return messages;
  }

  clearBuffer(): void {
    this.messageBuffer = '';
  }

  createRequest(method: string, params?: Record<string, unknown>): string {
    const message: AcpMessage = {
      type: 'request',
      method,
      params
    };
    return this.toJsonRpc(message);
  }

  createResponse(id: string | number, result: unknown): string {
    const message: AcpMessage = {
      type: 'response',
      id,
      result
    };
    return this.toJsonRpc(message);
  }

  createError(id: string | number, code: number, message: string, data?: unknown): string {
    const message: AcpMessage = {
      type: 'error',
      id,
      error: { code, message, data }
    };
    return this.toJsonRpc(message);
  }
}

export function createMessageTranslator(): MessageTranslator {
  return new MessageTranslator();
}