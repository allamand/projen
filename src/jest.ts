import { NodeProject } from './node-project';
import { Semver } from './semver';
import { TypescriptConfig } from './typescript';
import { StartEntryCategory } from './start';

const DEFAULT_JEST_VERSION = Semver.caret('26.4.2');

export interface JestOptions {

  /**
   * Collect coverage.
   * @default true
   */
  readonly coverage?: boolean;

  /**
   * Specify the global coverage thresholds
   */
  readonly coverageThreshold?: CoverageThreshold;

  /**
   * Defines `testPathIgnorePatterns` and `coveragePathIgnorePatterns`
   * @default "/node_modules/"
   */
  readonly ignorePatterns?: string[];

  /**
   * Configure for typescript.
   */
  readonly typescript?: TypescriptConfig;

  /**
   * The version of jest to use.
   *
   * @default ^26.4.2
   */
  readonly jestVersion?: Semver;
}

export interface CoverageThreshold {
  readonly branches?: number;
  readonly functions?: number;
  readonly lines?: number;
  readonly statements?: number;
}

/**
 * Installs the following npm scripts:
 *
 * - `test` will run `jest --passWithNoTests`
 * - `test:watch` will run `jest --watch`
 * - `test:update` will run `jest -u`
 *
 */
export class Jest {
  /**
   * Escape hatch.
   */
  public readonly config: any;

  private readonly ignorePatterns: string[];

  constructor(project: NodeProject, options: JestOptions = { }) {
    const version = options.jestVersion ?? DEFAULT_JEST_VERSION;

    project.addDevDependencies({ jest: version });

    this.ignorePatterns = options.ignorePatterns ?? [ '/node_modules/' ];

    this.config = {
      clearMocks: true,
      collectCoverage: options.coverage ?? true,
      coveragePathIgnorePatterns: this.ignorePatterns,
      testPathIgnorePatterns: this.ignorePatterns,
    };

    if (options.typescript) {
      this.config.preset = 'ts-jest';

      // only processs .ts files
      this.config.testMatch = [
        '**/__tests__/**/*.ts?(x)',
        '**/?(*.)+(spec|test).ts?(x)',
      ];

      // specify tsconfig.json
      this.config.globals = {
        'ts-jest': {
          tsConfig: options.typescript.fileName,
        },
      }

      // add relevant deps
      project.addDevDependencies({
        '@types/jest': Semver.caret('26.0.7'),
        'ts-jest': Semver.caret('26.1.0'),
      });
    }

    if (options.coverageThreshold) {
      this.config.coverageThreshold = {
        global: options.coverageThreshold,
      };
    }

    const jestOpts = [ '--passWithNoTests' ];

    // if the project has anti-tamper configured, it should be safe to always run tests
    // with --updateSnapshot because if we forget to commit a snapshot change the CI build will fail.
    if (project.antitamper) {
      jestOpts.push('--updateSnapshot');
    }

    project.addTestCommand(`jest ${jestOpts.join(' ')}`);

    project.addScripts({
      'test:watch': 'jest --watch',
      'test:update': 'jest --updateSnapshot',
    });

    project.start?.addEntry('test:watch', {
      descrtiption: 'Run jest in watch mode',
      category: StartEntryCategory.TEST,
    });

    project.addFields({ jest: this.config });

    project.npmignore.exclude('/coverage');
    project.gitignore.exclude('/coverage');
  }

  public addIgnorePattern(pattern: string) {
    this.ignorePatterns.push(pattern);
  }
}
