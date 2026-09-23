/*
 * Builds an importable solution zip by taking an existing solution export (normally
 * ApprovalUIManagement_1_6_0_0_managed.zip) and replacing only the ApprovalUIManagement control
 * with the freshly built one. Anything else in the base zip is copied byte-for-byte.
 *
 *   npm run build
 *   npm run package -- --base <ApprovalUIManagement_x_managed.zip> [--version 2.0.0.0] [--out dist]
 *
 * The Managed flag is kept from the base zip, so a managed base produces a managed upgrade.
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const root = path.resolve(__dirname, "..");
const built = path.join(root, "out", "controls", "ApprovalUIManagement");
const base = arg("base");
const version = arg("version", "2.0.0.0");
const outDir = path.resolve(root, arg("out", "dist"));

(async () => {
    if (!base) throw new Error("--base <existing solution zip> is required");
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) throw new Error(`--version must look like 2.0.0.0, got ${version}`);
    if (!fs.existsSync(path.join(built, "bundle.js"))) throw new Error("out/controls/ApprovalUIManagement is missing - run `npm run build` first");

    // the solution component name is <publisher prefix>_<namespace>.<constructor>
    const manifest = fs.readFileSync(path.join(built, "ControlManifest.xml"), "utf8");
    const ns = (manifest.match(/namespace="([^"]+)"/) || [])[1];
    const ctor = (manifest.match(/constructor="([^"]+)"/) || [])[1];

    const zip = await JSZip.loadAsync(fs.readFileSync(base));
    const solutionXml = zip.file("solution.xml");
    if (!solutionXml) throw new Error("base zip has no solution.xml");
    let sol = await solutionXml.async("string");
    const prefix = (sol.match(/<CustomizationPrefix>([^<]+)<\/CustomizationPrefix>/) || [])[1];
    const uniqueName = (sol.match(/<SolutionManifest>[\s\S]*?<UniqueName>([^<]+)<\/UniqueName>/) || [])[1];
    const CONTROL = `${prefix}_${ns}.${ctor}`;
    const managed = /<Managed>1<\/Managed>/.test(sol);
    const oldVersion = (sol.match(/<Version>([^<]+)<\/Version>/) || [])[1];
    sol = sol.replace(/<Version>[^<]+<\/Version>/, `<Version>${version}</Version>`);
    if (!sol.includes(`schemaName="${CONTROL}"`)) throw new Error(`base solution does not contain ${CONTROL}`);
    zip.file("solution.xml", sol);

    // drop every file of the old control, then add the new build
    Object.keys(zip.files)
        .filter((f) => f.startsWith(`Controls/${CONTROL}/`))
        .forEach((f) => zip.remove(f));
    const walk = (dir) =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    for (const file of walk(built)) {
        const rel = path.relative(built, file).split(path.sep).join("/");
        zip.file(`Controls/${CONTROL}/${rel}`, fs.readFileSync(file), { createFolders: false });
    }

    fs.mkdirSync(outDir, { recursive: true });
    const name = `${uniqueName}_${version.replace(/\./g, "_")}${managed ? "_managed" : ""}.zip`;
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log(`${name}  (${managed ? "managed" : "unmanaged"}, ${oldVersion} -> ${version}, ${(buf.length / 1024).toFixed(0)} KB)`);
    console.log(`written to ${path.relative(root, path.join(outDir, name))}`);
})().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
