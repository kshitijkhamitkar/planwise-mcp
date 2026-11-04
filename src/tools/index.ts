import { salesToolNames } from "./salesTools.js";
import { inventoryToolNames } from "./inventoryTools.js";
import { planningToolNames } from "./planningTools.js";

export const allToolNames = [
  ...salesToolNames,
  ...inventoryToolNames,
  ...planningToolNames,
] as const;
