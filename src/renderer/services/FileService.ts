export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
}

export interface UploadOptions {
  conversationId?: string;
  agentType?: string;
}

class FileService {
  async uploadFile(file: File, options?: UploadOptions): Promise<{ success: boolean; data?: FileInfo; error?: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (options?.conversationId) {
        formData.append("conversationId", options.conversationId);
      }
      if (options?.agentType) {
        formData.append("agentType", options.agentType);
      }

      const response = await window.electron.ipcRenderer.invoke("file:upload", formData);
      return response;
    } catch (error) {
      return { success: false, error: "Failed to upload file" };
    }
  }

  async uploadFiles(files: File[], options?: UploadOptions): Promise<{ success: boolean; data?: FileInfo[]; error?: string }> {
    const results: FileInfo[] = [];
    for (const file of files) {
      const result = await this.uploadFile(file, options);
      if (result.success && result.data) {
        results.push(result.data);
      }
    }
    return { success: true, data: results };
  }

  async downloadFile(fileId: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("file:download", fileId);
      if (response.success && response.data) {
        const blob = new Blob([response.data]);
        return { success: true, data: blob };
      }
      return { success: false, error: "Failed to download file" };
    } catch (error) {
      return { success: false, error: "Failed to download file" };
    }
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("file:delete", fileId);
      return response;
    } catch (error) {
      return { success: false, error: "Failed to delete file" };
    }
  }

  async listFiles(conversationId?: string): Promise<{ success: boolean; data?: FileInfo[]; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("file:list", { conversationId });
      return response;
    } catch (error) {
      return { success: false, error: "Failed to list files" };
    }
  }

  async getFilePreview(fileId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const response = await window.electron.ipcRenderer.invoke("file:preview", fileId);
      return response;
    } catch (error) {
      return { success: false, error: "Failed to get file preview" };
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export const fileService = new FileService();
export default fileService;