import type { Config } from 'jest';

/**
 * Jest configuration.
 *
 * Interview-relevant notes:
 *
 *  - Jest is a runner WITH batteries: runner, assertions (`expect`), mocking,
 *    snapshots, coverage and watch in one package. Mocha by contrast is only a
 *    runner and needs Chai and Sinon bolted on. That difference is the whole
 *    reason both still exist.
 *
 *  - `maxWorkers` parallelises at FILE level — each file runs in its own worker
 *    process. Tests inside one file are sequential. That is why a suite only
 *    scales if its files are independent, and why shared mutable fixtures kill
 *    parallelism before anything else does.
 *
 *  - `globalSetup` / `globalTeardown` run ONCE for the whole run, outside the
 *    worker processes. They own the test-data lifecycle: created before the
 *    first test, removed after the last, whatever happened in between.
 */
const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',

    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.spec.ts'],

    globalSetup: '<rootDir>/src/support/global-setup.ts',
    globalTeardown: '<rootDir>/src/support/global-teardown.ts',
    setupFilesAfterEnv: ['<rootDir>/src/support/setup.ts'],

    // A public target: generous enough for network latency, tight enough that a
    // hung request fails rather than stalling the run.
    testTimeout: 30_000,
    maxWorkers: process.env.CI ? 2 : '50%',

    /**
     * Reporters.
     *
     * `default` keeps the human-readable console output. `jest-junit` writes
     * JUnit XML, which is the only part of this that matters in CI: without a
     * machine-readable report, a failure is a line buried in a 2000-line log
     * that somebody has to scroll to. With one, GitHub Actions, Jenkins and
     * Azure Pipelines all annotate the failing test by name, and flaky-test
     * history becomes queryable instead of anecdotal.
     *
     * JUnit XML rather than a prettier HTML report because XML is what every CI
     * already parses. An HTML report is for a human reading it deliberately;
     * XML is for the failure finding the human.
     */
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'reports',
                outputName: 'junit.xml',
                // Without these the suite name is the file path, which reads
                // badly in a CI UI.
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestorSeparator: ' > ',
                addFileAttribute: 'true',
            },
        ],
    ],

    verbose: true,
    clearMocks: true,
    restoreMocks: true,

    collectCoverageFrom: ['src/**/*.ts', '!src/support/**'],

    moduleNameMapper: {
        '^@clients/(.*)$': '<rootDir>/src/clients/$1',
        '^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
        '^@support/(.*)$': '<rootDir>/src/support/$1',
    },
};

export default config;
