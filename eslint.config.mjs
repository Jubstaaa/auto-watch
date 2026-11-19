import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist/'] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
    },
    {
        rules: {
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        },
    },
    {
        // Fakes implement async interfaces without awaiting anything.
        files: ['test/**'],
        rules: { '@typescript-eslint/require-await': 'off' },
    },
    { files: ['**/*.mjs'], extends: [tseslint.configs.disableTypeChecked] },
    prettier
)
