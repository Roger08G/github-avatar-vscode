import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const buildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: production ? false : 'inline',
    minify: production,
    treeShaking: true,
    logLevel: 'info',
};

if (watch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('Watching extension sources...');
} else {
    await esbuild.build(buildOptions);
}
