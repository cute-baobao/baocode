import { createBashTool } from "./bash";
import { createGlobTool } from "./glob";
import { createGrepTool } from "./grep";
import { createReadFileTool } from "./read-file";
import { createWriteFileTool } from "./write-file";
import { createEditFileTool } from "./edit-file";
import { MODE, type Mode } from "@baocode/database/enums";

export function createTools(cwd: string, mode: Mode) {
  const readOnlyTools = {
    readFile: createReadFileTool(cwd),
    listDirectory: createBashTool(cwd),
    glob: createGlobTool(cwd),
    grep: createGrepTool(cwd),
  };

  if (mode === MODE.PLAN) {
    return readOnlyTools;
  }

  return {
    ...readOnlyTools,
    writeFile: createWriteFileTool(cwd),
    editFile: createEditFileTool(cwd),
    bash: createBashTool(cwd),
  }
}
