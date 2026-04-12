import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const withMDX = createMDX();
function resolveGuideBasePath(value: string | undefined): string | undefined {
	if (!value?.trim()) {
		return undefined;
	}

	const normalized = value.replace(/^\/+|\/+$/g, '');
	if (!normalized) {
		return undefined;
	}

	return `/${normalized}`;
}

const GUIDE_BASE_PATH = resolveGuideBasePath(process.env.GUIDE_BASE_PATH);

export default withMDX({
	output: 'standalone',
	basePath: GUIDE_BASE_PATH,
	serverExternalPackages: ['typescript', 'twoslash'],
	images: {
		dangerouslyAllowSVG: true,
		contentDispositionType: 'attachment',
		contentSecurityPolicy: "default-src 'self'; frame-src 'none'; sandbox;",
		remotePatterns: [
			{
				protocol: 'http',
				hostname: 'localhost',
			},
		],
	},
	poweredByHeader: false,
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
	reactCompiler: true,
	typescript: {
		ignoreBuildErrors: true,
	},
	webpack(config) {
		config.module.rules.push({
			test: /\.svg$/,
			use: ['@svgr/webpack'],
		});

		return config;
	},
} satisfies NextConfig);
