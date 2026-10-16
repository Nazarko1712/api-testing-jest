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
