import path from 'node:path';
import ts from 'typescript';

describe('Adapter Types Spec', () =>
  ['IAdapter', 'Adapter'].forEach(type =>
    it(`should preserve datasource types on ${type}.reset`, () => {
      const fileName = path.resolve(__dirname, 'adapter-types.ts').replace(/\\/g, '/');
      const source = `
        import type { IAdapter } from '../../src';
        import type { Adapter } from '../../src/classes/adapter';

        declare const adapter: ${type}<{ id: number }>;

        adapter.reset();
        adapter.reset({ devSettings: { debug: true } });
        adapter.reset({
          get: (_index, _count, success) => success([{ id: 1 }]),
          settings: {
            onBeforeClip: items => items[0].data.id.toFixed()
          }
        });
        adapter.reset({
          settings: {
            onBeforeClip: items => items[0].data.id.toFixed()
          }
        });

        const get = (
          index: number,
          count: number,
          success: (rows: string[]) => void
        ) => success(['wrong']);

        // @ts-expect-error reset must preserve the Adapter's data type.
        adapter.reset({ get });
      `;
      const options: ts.CompilerOptions = {
        strict: true,
        strictPropertyInitialization: false,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2017,
        module: ts.ModuleKind.CommonJS,
        types: []
      };
      const host = ts.createCompilerHost(options);
      const getSourceFile = host.getSourceFile.bind(host);
      host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) =>
        name === fileName
          ? ts.createSourceFile(name, source, languageVersion, true)
          : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
      const program = ts.createProgram([fileName], options, host);

      expect(
        ts.getPreEmitDiagnostics(program).map(diagnostic =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        )
      ).toEqual([]);
    })
  ));
