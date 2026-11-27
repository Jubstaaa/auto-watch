import { node } from '@jubstaa/config/eslint/node'
import { defineConfig } from 'eslint/config'

export default defineConfig([...node({ tsconfigRootDir: import.meta.dirname })])
