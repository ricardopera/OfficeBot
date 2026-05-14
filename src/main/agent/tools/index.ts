import type { ToolSet } from 'ai';
import type { ApprovalEngine } from '../ApprovalEngine';
import { createReadFileTool } from './fs/readFile';
import { createWriteFileTool } from './fs/writeFile';
import { createEditFileTool } from './fs/editFile';
import { createListDirectoryTool } from './fs/listDirectory';
import { createGlobTool } from './fs/glob';
import { createGrepTool } from './fs/grep';
import { createBashTool } from './bash';
import { createReadExcelTool } from './office/readExcel';
import { createWriteExcelTool } from './office/writeExcel';
import { createReadDocumentTool } from './office/readDocument';
import { createReadPDFTool } from './office/readPDF';
import { createCreateReportTool } from './office/createReport';
import { createGenerateChartTool } from './office/generateChart';
import { createWebSearchTool } from './web/webSearch';

export function createToolSet(workspacePath: string, approval: ApprovalEngine, tavilyApiKey?: string, braveApiKey?: string): ToolSet {
  return {
    readFile: createReadFileTool(workspacePath),
    writeFile: createWriteFileTool(workspacePath, approval),
    editFile: createEditFileTool(workspacePath, approval),
    listDirectory: createListDirectoryTool(workspacePath),
    glob: createGlobTool(workspacePath),
    grep: createGrepTool(workspacePath),
    bash: createBashTool(workspacePath, approval),
    readExcel: createReadExcelTool(workspacePath),
    writeExcel: createWriteExcelTool(workspacePath, approval),
    readDocument: createReadDocumentTool(workspacePath),
    readPDF: createReadPDFTool(workspacePath),
    createReport: createCreateReportTool(workspacePath, approval),
    generateChart: createGenerateChartTool(workspacePath, approval),
    webSearch: createWebSearchTool(tavilyApiKey, braveApiKey),
  };
}
