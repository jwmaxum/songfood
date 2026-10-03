import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.environment.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^server-only$': '<rootDir>/src/__tests__/server-only.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
  collectCoverageFrom: ['src/app/api/**/*.ts', 'src/lib/**/*.ts', '!src/**/*.d.ts'],
};
export default config;
