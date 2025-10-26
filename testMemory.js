// testMemory.js
import { storeMemory } from "./mcp/memoryTools.js";

await storeMemory("test1", "Hello world test memory", "test", "manual");

process.exit();
