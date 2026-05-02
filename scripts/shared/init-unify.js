const { mkdir, access, writeFile } = require("fs/promises");
const { constants } = require("fs");
const path = require("path");

async function ensureDir(relativeDir) {
  const fullPath = path.resolve(process.cwd(), relativeDir);
  await mkdir(fullPath, { recursive: true });
  process.stdout.write(`ensured directory: ${relativeDir}\n`);
}

async function ensureFile(relativePath, content) {
  const fullPath = path.resolve(process.cwd(), relativePath);

  try {
    await access(fullPath, constants.F_OK);
    process.stdout.write(`exists, skipped file: ${relativePath}\n`);
  } catch {
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf8");
    process.stdout.write(`created file: ${relativePath}\n`);
  }
}

async function main() {
  const directories = [
    "src/backend/admin-app/api",
    "src/backend/public-app/api",
    "src/backend/shared/services",
    "src/pages/admin",
    "src/pages/public",
    "src/ui/admin-app/pages",
    "src/ui/public-app/pages",
    "src/ui/shared/components",
    "src/ui/shared/contexts",
    "prisma",
    "programs/unify-core/src",
  ];

  for (const dir of directories) {
    await ensureDir(dir);
  }

  await ensureFile(
    ".env.example",
    [
      "SOLANA_RPC_URL=",
      "CNFT_AUTHORITY_SECRET_KEY=",
      "CNFT_COLLECTION=",
      "CNFT_MERKLE_TREE=",
      "DATABASE_URL=postgresql://user:password@localhost:5432/unify",
      "",
    ].join("\n")
  );

  process.stdout.write("Unify project initializer complete.\n");
}

main().catch((error) => {
  process.stderr.write(`initializer failed: ${String(error)}\n`);
  process.exit(1);
});
