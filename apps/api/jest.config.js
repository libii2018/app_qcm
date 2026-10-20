/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@qcm/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@qcm/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/testSetup.ts'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/**/*.d.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 15000,
  maxWorkers: 1,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Automatically clear mock calls, instances, and results before each test
  clearMocks: true,
  // Indicate which mocks should be automatically restored before each test
  restoreMocks: true,
};
