import type { NextConfig } from 'next';

const GUIDE_REDIRECT_URL = process.env.GUIDE_REDIRECT_URL ?? 'https://discordjs.guide';

export default {
	output: 'standalone',
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
	async redirects() {
		return [
			{
				source: '/static/logo.svg',
				destination: '/logo.svg',
				permanent: true,
			},
			{
				source: '/guide/:path*',
				destination: `${GUIDE_REDIRECT_URL.replace(/\/$/, '')}/:path*`,
				permanent: false,
			},
		];
	},
} satisfies NextConfig;
