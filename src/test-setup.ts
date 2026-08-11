// Test setup — ensure reflect-metadata is loaded for NestJS decorators
import 'reflect-metadata';
import { Logger } from '@nestjs/common';

Logger.overrideLogger(false);
