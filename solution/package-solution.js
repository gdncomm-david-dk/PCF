/*
 * Builds an importable solution zip by taking an existing solution export and replacing only the
 * code component(s) it contains with the freshly built ones from out/controls. Anything else in the
 * base zip is copied byte-for-byte.
 *
 *   npm run build
 *   npm run package -- --base ApprovalUIManagement_1_6_0_0_managed.zip      [--version 2.0.0.0] [--out dist]
 *   npm run package -- --base MarketingSlotCalendarSolution_managed.zip     [--version 2.0.0.0] [--out dist]
 *
 * Every control under out/controls whose component name (<publisher prefix>_<namespace>.<constructor>)
 * appears in the base solution is swapped in. The Managed flag is kept from the base zip, so a
 * managed base produces a managed upgrade.
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const root = path.resolve(__dirname, "..");
const builtRoot = path.join(root, "out", "controls");
const base = arg("base");
const version = arg("version", "2.0.0.0");
const outDir = path.resolve(root, arg("out", "dist"));

const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

(async () => {
    if (!base) throw new Error("--base <existing solution zip> is required");
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) throw new Error(`--version must look like 2.0.0.0, got ${version}`);
    if (!fs.existsSync(builtRoot)) throw new Error("out/controls is missing - run `npm run build` first");

    const zip = await JSZip.loadAsync(fs.readFileSync(base));
    const solutionXml = zip.file("solution.xml");
    if (!solutionXml) throw new Error("base zip has no solution.xml");
    let sol = await solutionXml.async("string");
    const prefix = (sol.match(/<CustomizationPrefix>([^<]+)<\/CustomizationPrefix>/) || [])[1];
    const uniqueName = (sol.match(/<SolutionManifest>[\s\S]*?<UniqueName>([^<]+)<\/UniqueName>/) || [])[1];
    const managed = /<Managed>1<\/Managed>/.test(sol);
    const oldVersion = (sol.match(/<Version>([^<]+)<\/Version>/) || [])[1];

    // the solution component name is <publisher prefix>_<namespace>.<constructor>
    const controls = fs
        .readdirSync(builtRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(builtRoot, e.name, "ControlManifest.xml")))
        .map((e) => {
            const dir = path.join(builtRoot, e.name);
            const manifest = fs.readFileSync(path.join(dir, "ControlManifest.xml"), "utf8");
            const ns = (manifest.match(/namespace="([^"]+)"/) || [])[1];
            const ctor = (manifest.match(/constructor="([^"]+)"/) || [])[1];
            return { dir, name: `${prefix}_${ns}.${ctor}` };
        })
        .filter((c) => sol.includes(`schemaName="${c.name}"`));
    if (controls.length === 0) throw new Error(`none of the built controls is part of ${uniqueName}`);

    sol = sol.replace(/<Version>[^<]+<\/Version>/, `<Version>${version}</Version>`);
    zip.file("solution.xml", sol);

    for (const c of controls) {
        // drop every file of the old control, then add the new build
        Object.keys(zip.files)
            .filter((f) => f.startsWith(`Controls/${c.name}/`))
            .forEach((f) => zip.remove(f));
        for (const file of walk(c.dir)) {
            const rel = path.relative(c.dir, file).split(path.sep).join("/");
            zip.file(`Controls/${c.name}/${rel}`, fs.readFileSync(file), { createFolders: false });
        }
    }

    fs.mkdirSync(outDir, { recursive: true });
    const name = `${uniqueName}_${version.replace(/\./g, "_")}${managed ? "_managed" : ""}.zip`;
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log(`${name}  (${managed ? "managed" : "unmanaged"}, ${oldVersion} -> ${version}, ${(buf.length / 1024).toFixed(0)} KB)`);
    console.log(`controls: ${controls.map((c) => c.name).join(", ")}`);
    console.log(`written to ${path.relative(root, path.join(outDir, name))}`);
})().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
