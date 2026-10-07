import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);

const manifest = {
  name: "vakilgram-runtime-audit",
  version: source.version,
  private: true,
  dependencies: source.dependencies
};

const directory = new URL("../.runtime-audit/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("package.json", directory),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8"
);
