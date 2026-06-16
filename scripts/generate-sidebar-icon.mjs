import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import potrace from "potrace";

const DEFAUTL_IMAGE_NAME = "github-avatar-trace.png";

const input = resolve(
    process.cwd(),
    process.argv[2] ?? `media/${DEFAUTL_IMAGE_NAME}`,
);

const output = resolve(
    process.cwd(),
    process.argv[3] ?? "media/github-avatar.svg",
);

const tempDir = resolve(process.cwd(), ".tmp");
const tempFile = resolve(tempDir, DEFAUTL_IMAGE_NAME);

async function fileExists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function traceImage(path) {
    return new Promise((resolvePromise, rejectPromise) => {
        potrace.trace(
            path,
            {
                threshold: 128,
                color: "#ffffff",
                background: "transparent",
                turdSize: 2,
                alphaMax: 1,
                optCurve: true,
                optTolerance: 0.2,
            },
            (error, svg) => {
                if (error) {
                    rejectPromise(error);
                    return;
                }

                resolvePromise(svg);
            },
        );
    });
}

async function main() {
    if (!(await fileExists(input))) {
        throw new Error(`No se encontró la imagen de entrada:\n${input}`);
    }

    await mkdir(tempDir, { recursive: true });
    await mkdir(dirname(output), { recursive: true });

    await sharp(input)
        .flatten({ background: "#000000" })
        .trim({ background: "#000000", threshold: 12 })
        .resize(448, 448, {
            fit: "contain",
            background: "#000000",
            withoutEnlargement: false,
        })
        .extend({
            top: 32,
            bottom: 32,
            left: 32,
            right: 32,
            background: "#000000",
        })
        .grayscale()
        .threshold(145)
        .negate()
        .png()
        .toFile(tempFile);

    const tracedSvg = await traceImage(tempFile);

    const finalSvg = tracedSvg
        .replace(/width="[^"]+"/, 'width="24"')
        .replace(/height="[^"]+"/, 'height="24"')
        .replace(
            "<svg ",
            '<svg preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" ',
        );

    await writeFile(output, finalSvg, "utf8");
    await rm(tempDir, { recursive: true, force: true });

    console.log(`Icono generado correctamente:\n${output}`);
}

main().catch(async (error) => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => { });

    console.error(
        error instanceof Error
            ? error.message
            : "Error desconocido al generar el icono.",
    );

    process.exit(1);
});