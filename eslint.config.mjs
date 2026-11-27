import { node } from '@jubstaaa/config/eslint/node'
import { defineConfig } from 'eslint/config'

export default defineConfig([...node({ tsconfigRootDir: import.meta.dirname })])
