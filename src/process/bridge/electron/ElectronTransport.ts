import { ipcMain, ipcRenderer, IpcMainInvokeEvent } from 'electron';
import { BaseBridge, ITransport, IpcPayload, validatePayloadSize, BridgeHandler } from '../contracts/ipcBridge';

export class ElectronTransport extends BaseBridge implements ITransport {
  private connected = false;

  connect(): void {
    if (this.connected) return;
    this.setupIpcHandlers();
    this.connected = true;
  }

  disconnect(): void {
    this.removeIpcHandlers();
    this.connected = false;
    this.emit('disconnected');
  }

  send(channel: string, data: unknown): void {
    if (!validatePayloadSize(data)) {
      this.metrics.droppedEvents++;
      this.emit('bridge:error', { channel, error: 'Payload exceeds 50MB', code: 'PAYLOAD_TOO_LARGE' });
      return;
    }
    try {
      ipcRenderer.send(channel, data);
      this.metrics.messagesSent++;
    } catch (error) {
      this.metrics.errors++;
      this.emit('bridge:error', { channel, error: String(error), code: 'SEND_FAILED' });
    }
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    const wrappedHandler = (_event: IpcMainInvokeEvent, ...args: unknown[]) => {
      this.metrics.messagesReceived++;
      handler(...args);
    };
    ipcRenderer.on(event, wrappedHandler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    ipcRenderer.removeListener(event, handler as (...args: unknown[]) => void);
  }

  emitToRenderer(channel: string, data: unknown): void {
    if (!validatePayloadSize(data)) {
      this.metrics.droppedEvents++;
      this.emit('bridge:error', { channel, error: 'Payload exceeds 50MB', code: 'PAYLOAD_TOO_LARGE' });
      return;
    }
    ipcRenderer.send(channel, data);
  }

  private setupIpcHandlers(): void {
    ipcMain.on('bridge:invoke', async (_event: IpcMainInvokeEvent, payload: IpcPayload) => {
      this.metrics.messagesReceived++;
      try {
        const result = await this.executeHandler(payload.channel, payload);
        (_event as unknown as { returnValue: unknown }).returnValue = result;
      } catch (error) {
        this.metrics.errors++;
        this.emit('bridge:error', { channel: payload.channel, error: String(error), code: 'HANDLER_ERROR' });
      }
    });

    ipcMain.handle('bridge:handle', async (_event: IpcMainInvokeEvent, payload: IpcPayload) => {
      this.metrics.messagesReceived++;
      try {
        return await this.executeHandler(payload.channel, payload);
      } catch (error) {
        this.metrics.errors++;
        this.emit('bridge:error', { channel: payload.channel, error: String(error), code: 'HANDLER_ERROR' });
        throw error;
      }
    });
  }

  private removeIpcHandlers(): void {
    ipcMain.removeHandler('bridge:handle');
  }

  registerBridgeHandler(channel: string, handler: BridgeHandler): void {
    this.registerHandler(channel, handler);
  }
}

export const electronTransport = new ElectronTransport();