import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-config-prettier';

/**
 * ESLint 9 flat config.
 *
 * Style is Prettier's job. The rules enabled here exist to catch a test that
 * cannot fail:
 *
 *   no-floating-promises     an un-awaited `expect(...).resolves` resolves to a
 *                            truthy Promise, so the test passes having checked
 *                            nothing — the single most common silent-green bug
 *                            in an async API suite
 *   jest/no-focused-tests    one `test.only` committed to main reduces CI to
 *                            that single test while the badge stays green
 *   jest/no-disabled-tests   a `test.skip` with no ticket is coverage that
 *                            quietly disappeared
 *   jest/expect-expect       a test body with no assertion
 *   jest/no-conditional-expect  an assertion inside an `if` can be skipped
 *   jest/no-standalone-expect   an expect outside a test is never reported
 *
 * `prettier` sits last so it disables every rule that would fight the formatter.
 */
export default tseslint.config(
    {
        ignores: ['node_modules/', 'coverage/', 'eslint.config.mjs'],
    },

    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },

    {
        files: ['tests/**/*.ts'],
        ...jest.configs['flat/recommended'],
        rules: {
            ...jest.configs['flat/recommended'].rules,
            'jest/no-focused-tests': 'error',
            'jest/no-disabled-tests': 'error',
            // `expect-expect` was right that these tests contain no `expect`,
            // and wrong that they contain no assertion. The status assertion
            // lives in the client: `expectStatus(403)` inside
            // `bookingClient.replaceBooking(..., 403)` throws when the API
            // answers anything else, which is the whole point of passing the
            // expected status as a parameter. Teaching the rule where the
            // assertions are is the honest fix; switching it off would also
            // stop catching a test body that really does assert nothing.
            'jest/expect-expect': ['error', { assertFunctionNames: ['expect', 'bookingClient.*'] }],
            'jest/no-conditional-expect': 'error',
            'jest/no-standalone-expect': 'error',
            'jest/valid-expect': 'error',
        },
    },

    prettier,
);
