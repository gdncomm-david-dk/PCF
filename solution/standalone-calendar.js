/*
 * Builds the slot calendar as a separate code component, DK.Components.ULPSlotCalendar, in its own
 * solution "ULPSlotCalendar". Use it when an environment keeps serving an old MarketingSlotCalendar
 * bundle: a new component name cannot be cached, and it can sit next to the old one.
 *
 *   npm run build
 *   npm run package -- --base MarketingSlotCalendarSolution_managed.zip --version 2.0.0.3
 *   node solution/standalone-calendar.js --base dist/MarketingSlotCalendarSolution_2_0_0_3_managed.zip --version 1.0.0.0
 *
 * The control source is MarketingSlotCalendar/ unchanged; only the constructor, display name,
 * solution unique name and version differ. Bump --version (and the control version below) for
 * every upgrade of this solution.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const JSZip = require("jszip");

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const root = path.resolve(__dirname, "..");
const base = arg("base");
const version = arg("version", "1.0.0.0");
const controlVersion = version.split(".").slice(0, 3).join(".");
const outDir = path.resolve(root, arg("out", "dist"));
const CTOR = "ULPSlotCalendar";
const OLD = "dk_DK.Components.MarketingSlotCalendar";
const NEW = `dk_DK.Components.${CTOR}`;

const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const edit = (file, fn) => fs.writeFileSync(file, fn(fs.readFileSync(file, "utf8")));

(async () => {
    if (!base) throw new Error("--base <MarketingSlotCalendarSolution zip> is required");
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) throw new Error(`--version must look like 1.0.0.0, got ${version}`);

    // 1. a renamed copy of the control project, built with the repo's own toolchain
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "ulp-slot-calendar-"));
    for (const f of ["package.json", "pcfconfig.json", "tsconfig.json", "eslint.config.mjs"]) fs.copyFileSync(path.join(root, f), path.join(work, f));
    fs.symlinkSync(path.join(root, "node_modules"), path.join(work, "node_modules"), "dir");
    fs.cpSync(path.join(root, "MarketingSlotCalendar"), path.join(work, CTOR), { recursive: true });
    fs.rmSync(path.join(work, CTOR, "generated"), { recursive: true, force: true });
    edit(path.join(work, CTOR, "index.ts"), (s) => s.replace("export class MarketingSlotCalendar ", `export class ${CTOR} `));
    edit(path.join(work, CTOR, "ControlManifest.Input.xml"), (s) =>
        s.replace(/constructor="MarketingSlotCalendar" version="[^"]+"/, `constructor="${CTOR}" version="${controlVersion}"`)
    );
    edit(path.join(work, CTOR, "strings", "MarketingSlotCalendar.1033.resx"), (s) => s.replace("<value>Marketing Slot Calendar</value>", "<value>ULP Slot Calendar</value>"));
    edit(path.join(work, "tsconfig.json"), (s) => s.replace(/"include": \[[^\]]*\]/, `"include": ["${CTOR}/**/*.ts", "${CTOR}/**/*.tsx"]`));
    edit(path.join(work, "eslint.config.mjs"), (s) => s.replace(/files: \[[^\]]*\]/, `files: ["${CTOR}/**/*.{ts,tsx}"]`));
    execSync("npx pcf-scripts build --buildMode production", { cwd: work, stdio: "inherit" });
    const built = path.join(work, "out", "controls", CTOR);

    // 2. the base solution with every reference renamed, and the new build as its only control
    const src = await JSZip.loadAsync(fs.readFileSync(base));
    const zip = new JSZip();
    for (const name of Object.keys(src.files)) {
        const f = src.files[name];
        if (f.dir || name.startsWith("Controls/")) continue;
        let text = (await f.async("string")).split(OLD).join(NEW);
        if (name === "solution.xml") {
            text = text
                .replace(/(<SolutionManifest>[\s\S]*?<UniqueName>)[^<]+(<\/UniqueName>)/, `$1${CTOR}$2`)
                .replace(/(<SolutionManifest>[\s\S]*?<LocalizedName description=")[^"]+(")/, "$1ULP Slot Calendar$2")
                .replace(/<Version>[^<]+<\/Version>/, `<Version>${version}</Version>`);
        }
        zip.file(name, text);
    }
    for (const file of walk(built)) {
        const rel = path.relative(built, file).split(path.sep).join("/");
        zip.file(`Controls/${NEW}/${rel}`, fs.readFileSync(file), { createFolders: false });
    }
    const managed = /<Managed>1<\/Managed>/.test(await zip.file("solution.xml").async("string"));

    fs.mkdirSync(outDir, { recursive: true });
    const name = `${CTOR}_${version.replace(/\./g, "_")}${managed ? "_managed" : ""}.zip`;
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(path.join(outDir, name), buf);
    fs.rmSync(work, { recursive: true, force: true });
    console.log(`${name}  (${managed ? "managed" : "unmanaged"}, control ${NEW} ${controlVersion}, ${(buf.length / 1024).toFixed(0)} KB)`);
})().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
