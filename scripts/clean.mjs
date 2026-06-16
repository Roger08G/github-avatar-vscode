import { rm } from "node:fs/promises";
import { glob } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await rm("coverage", { recursive: true, force: true });

for await (const file of glob("*.vsix")) {
    await rm(file, { force: true });
}
