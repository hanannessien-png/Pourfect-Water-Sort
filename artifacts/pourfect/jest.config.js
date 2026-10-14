/** Pure-logic tests (engine, economy, persistence, ad pacing). No React Native runtime needed. */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|webp)$': '<rootDir>/src/__mocks__/asset.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'], babelrc: false, configFile: false },
    ],
  },
};
