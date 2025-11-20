#!/usr/bin/env node

import { exec } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import AdmZip from 'adm-zip';
import { glob } from 'glob';

const execAsync = promisify(exec);

class OpenSCADLibrariesPlugin {
    constructor(options = {}) {
        this.configFile = options.configFile || 'libs-config.json';
        this.libsDir = options.libsDir || 'libs';
        this.publicLibsDir = options.publicLibsDir || 'public/libraries';
        this.srcWasmDir = options.srcWasmDir || 'src/wasm';
        this.buildMode = options.buildMode || 'all'; // 'all', 'wasm', 'fonts', 'libs'
        this.config = null;
    }

    apply(compiler) {
        const pluginName = 'OpenSCADLibrariesPlugin';

        compiler.hooks.beforeRun.tapAsync(pluginName, async (_, callback) => {
            try {
                await this.loadConfig();

                switch (this.buildMode) {
                    case 'all':
                        await this.buildAll();
                        break;
                    case 'wasm':
                        await this.buildWasm();
                        break;
                    case 'fonts':
                        await this.buildFonts();
                        break;
                    case 'libs':
                        await this.buildAllLibraries();
                        break;
                    case 'clean':
                        await this.clean();
                        break;
                }

                callback();
            } catch (error) {
                callback(error);
            }
        });
    }

    async loadConfig() {
        try {
            const configContent = await fs.readFile(this.configFile, 'utf-8');
            this.config = JSON.parse(configContent);
        } catch (error) {
            throw new Error(`Failed to load config from ${this.configFile}: ${error.message}`);
        }
    }

    async ensureDir(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async downloadFile(url, outputPath) {
        console.log(`Downloading ${url} to ${outputPath}`);

        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    return this.downloadFile(response.headers.location, outputPath)
                        .then(resolve)
                        .catch(reject);
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                const fileStream = createWriteStream(outputPath);
                pipeline(response, fileStream)
                    .then(resolve)
                    .catch(reject);
            }).on('error', reject);
        });
    }

    async cloneRepo(repo, targetDir, branch = 'master', shallow = true) {
        const cloneArgs = [
            'clone',
            '--recurse',
            shallow ? '--depth 1' : '',
            `--branch ${branch}`,
            '--single-branch',
            repo,
            targetDir
        ].filter(Boolean);

        console.log(`Cloning ${repo} to ${targetDir}`);
        try {
            await execAsync(`git ${cloneArgs.join(' ')}`);
        } catch (error) {
            console.error(`Failed to clone ${repo}:`, error.message);
            throw error;
        }
    }

    async createZip(sourceDir, outputPath, includes = [], excludes = [], workingDir = '.') {
        await this.ensureDir(path.dirname(outputPath));

        const fullSourceDir = path.join(sourceDir, workingDir);
        const zip = new AdmZip();

        console.log(`Creating zip: ${outputPath} from ${fullSourceDir}`);

        // If no includes specified, default to *.scad
        const patterns = includes.length > 0 ? includes : ['*.scad'];

        // Convert excludes to glob ignore pattern
        const ignore = excludes.map(p => {
            // glob ignore patterns don't support the same syntax as find, 
            // but generally standard globs work. 
            // We might need to adjust if patterns are complex.
            return p;
        });

        try {
            const files = await glob(patterns, {
                cwd: fullSourceDir,
                ignore: ignore,
                nodir: true,
                dot: true
            });

            if (files.length === 0) {
                console.warn(`No files found to zip in ${fullSourceDir}`);
            }

            for (const file of files) {
                const filePath = path.join(fullSourceDir, file);
                const zipPath = path.dirname(file);
                // Add file to zip, preserving relative structure
                zip.addLocalFile(filePath, zipPath === '.' ? '' : zipPath);
            }

            await zip.writeZipPromise(outputPath);
        } catch (error) {
            console.error(`Failed to create zip ${outputPath}:`, error.message);
            throw error;
        }
    }

    async buildWasm() {
        const { wasmBuild } = this.config;
        const wasmDir = wasmBuild.target;
        const wasmZip = `${wasmDir}.zip`;

        await this.ensureDir(this.libsDir);

        // Check if we need to download/extract
        const jsFile = path.join(wasmDir, 'openscad.js');
        const wasmFile = path.join(wasmDir, 'openscad.wasm');

        if (!existsSync(wasmDir) || !existsSync(jsFile) || !existsSync(wasmFile)) {
            // Clean up potential partial install
            try { await fs.rm(wasmDir, { recursive: true, force: true }); } catch { }
            await this.ensureDir(wasmDir);

            await this.downloadFile(wasmBuild.url, wasmZip);

            console.log(`Extracting WASM to ${wasmDir}`);
            const zip = new AdmZip(wasmZip);
            zip.extractAllTo(wasmDir, true);

            // Verify extraction
            if (!existsSync(jsFile)) {
                // Check if it's in a subfolder (some zips have a root folder)
                const entries = zip.getEntries();
                const rootDir = entries[0].entryName.split('/')[0];
                if (rootDir && existsSync(path.join(wasmDir, rootDir, 'openscad.js'))) {
                    // Move files up
                    const subDir = path.join(wasmDir, rootDir);
                    const files = await fs.readdir(subDir);
                    for (const file of files) {
                        await fs.rename(path.join(subDir, file), path.join(wasmDir, file));
                    }
                    await fs.rm(subDir, { recursive: true, force: true });
                }
            }
        }

        await this.ensureDir('public');

        const jsTarget = 'public/openscad.js';
        const wasmTarget = 'public/openscad.wasm';

        // Remove existing files
        try { await fs.unlink(jsTarget); } catch { }
        try { await fs.unlink(wasmTarget); } catch { }

        // Copy files instead of symlink for better Windows support
        await fs.copyFile(path.join(wasmDir, 'openscad.js'), jsTarget);
        await fs.copyFile(path.join(wasmDir, 'openscad.wasm'), wasmTarget);

        // Handle src/wasm
        // Instead of symlink, we might need to copy or just leave it if it's not strictly needed for dev
        // But let's try to copy the directory content if it doesn't exist
        try {
            await fs.rm(this.srcWasmDir, { recursive: true, force: true });
        } catch { }

        await this.ensureDir(this.srcWasmDir);
        // Copy contents of wasmDir to srcWasmDir
        // recursive copy is available in Node 16.7+
        await fs.cp(wasmDir, this.srcWasmDir, { recursive: true });

        console.log('WASM setup completed');
    }

    async buildFonts() {
        const { fonts } = this.config;
        const notoDir = path.join(this.libsDir, 'noto');
        const liberationDir = path.join(this.libsDir, 'liberation');

        await this.ensureDir(notoDir);

        // Download Noto fonts
        for (const font of fonts.notoFonts) {
            const fontPath = path.join(notoDir, font);
            if (!existsSync(fontPath)) {
                const url = fonts.notoBaseUrl + font;
                await this.downloadFile(url, fontPath);
            }
        }

        // Clone liberation fonts if not exists
        if (!existsSync(liberationDir)) {
            await this.cloneRepo(fonts.liberationRepo, liberationDir, fonts.liberationBranch);
        }

        // Create fonts zip
        const fontsZip = path.join(this.publicLibsDir, 'fonts.zip');
        await this.ensureDir(this.publicLibsDir);

        console.log('Creating fonts.zip');
        const zip = new AdmZip();

        // Add fonts.conf
        if (existsSync('fonts.conf')) {
            zip.addLocalFile('fonts.conf');
        }

        // Add Noto fonts
        const notoFiles = await glob('*.ttf', { cwd: notoDir });
        for (const file of notoFiles) {
            zip.addLocalFile(path.join(notoDir, file));
        }

        // Add Liberation fonts and licenses
        const libFiles = await glob('*.ttf', { cwd: liberationDir });
        for (const file of libFiles) {
            zip.addLocalFile(path.join(liberationDir, file));
        }
        if (existsSync(path.join(liberationDir, 'LICENSE'))) {
            zip.addLocalFile(path.join(liberationDir, 'LICENSE'));
        }
        if (existsSync(path.join(liberationDir, 'AUTHORS'))) {
            zip.addLocalFile(path.join(liberationDir, 'AUTHORS'));
        }

        await zip.writeZipPromise(fontsZip);
        console.log('Fonts setup completed');
    }

    async buildLibrary(library) {
        const libDir = path.join(this.libsDir, library.name);
        const zipPath = path.join(this.publicLibsDir, `${library.name}.zip`);

        // Clone repository if not exists
        if (!existsSync(libDir)) {
            await this.cloneRepo(library.repo, libDir, library.branch);
        }

        // Create zip
        await this.createZip(
            libDir,
            zipPath,
            library.zipIncludes || ['*.scad'],
            library.zipExcludes || [],
            library.workingDir || '.'
        );

        console.log(`Built ${library.name}`);
    }

    async buildAllLibraries() {
        await this.ensureDir(this.publicLibsDir);

        for (const library of this.config.libraries) {
            await this.buildLibrary(library);
        }
    }

    async clean() {
        console.log('Cleaning build artifacts...');

        const cleanPaths = [
            this.libsDir,
            'build',
            'public/openscad.js',
            'public/openscad.wasm',
            this.srcWasmDir
        ];

        for (const cleanPath of cleanPaths) {
            await fs.rm(cleanPath, { recursive: true, force: true });
        }

        // Clean zips in public/libraries
        const zips = await glob(`${this.publicLibsDir}/*.zip`);
        for (const zip of zips) {
            await fs.unlink(zip);
        }

        console.log('Clean completed');
    }

    async buildAll() {
        console.log('Building all libraries...');

        await this.buildWasm();
        await this.buildFonts();
        await this.buildAllLibraries();

        console.log('Build completed successfully!');
    }
}

export default OpenSCADLibrariesPlugin;
