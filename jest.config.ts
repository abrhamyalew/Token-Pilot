import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Silence NestJS reflection metadata warnings in test environment
  setupFiles: ['<rootDir>/src/test-setup.ts'],
};

export default config;
