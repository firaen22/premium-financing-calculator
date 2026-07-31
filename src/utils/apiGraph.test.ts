import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const relativeImport = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.{1,2}\/[^'"]+)['"]/g;

const graphEntries = ['api/simulate.ts', 'api/mcp.ts', 'api/chat.ts'];

const targetFor = (file: string, specifier: string): string => {
    const resolved = resolve(dirname(file), specifier);
    return resolved.endsWith('.js') ? `${resolved.slice(0, -3)}.ts` : `${resolved}.ts`;
};

describe('deployed API import graph', () => {
    it('uses explicit .js relative imports that resolve to source files', () => {
        const pending = graphEntries.map(entry => resolve(repoRoot, entry));
        const visited = new Set<string>();

        while (pending.length > 0) {
            const file = pending.pop() as string;
            if (visited.has(file) || file.endsWith('.test.ts')) continue;
            visited.add(file);

            const source = readFileSync(file, 'utf8');
            relativeImport.lastIndex = 0;
            for (const match of source.matchAll(relativeImport)) {
                const specifier = match[1];
                expect(specifier.endsWith('.js'), `${file}: relative import ${specifier} must end in .js`).toBe(true);
                const target = targetFor(file, specifier);
                expect(existsSync(target), `${file}: relative import ${specifier} resolves to missing ${target}`).toBe(true);
                if (existsSync(target)) pending.push(target);
            }
        }
    });
});
