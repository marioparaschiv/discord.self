import { esbuildPluginVersionInjector } from 'esbuild-plugin-version-injector';
import { createTsupConfig } from '../../tsup.config.js';

export default [
	createTsupConfig({
		entry: ['src/index.ts'],
		clean: true,
		esbuildPlugins: [esbuildPluginVersionInjector()],
	}),
	createTsupConfig({
		entry: ['src/web.ts'],
		clean: false,
		esbuildPlugins: [esbuildPluginVersionInjector()],
	}),
	createTsupConfig({
		entry: ['src/strategies/*.ts'],
		outDir: 'dist/strategies',
		clean: false,
		esbuildPlugins: [esbuildPluginVersionInjector()],
	}),
];
