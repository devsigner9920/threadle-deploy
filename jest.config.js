module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    'bin/**/*.ts',
    '!server/**/*.d.ts',
    '!**/__tests__/**'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@client/(.*)$': '<rootDir>/client/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true
      }
    }]
  },
  setupFilesAfterEnv: [],
  clearMocks: true,
  coverageDirectory: 'coverage',
  verbose: true,
  extensionsToTreatAsEsm: ['.ts'],
};
