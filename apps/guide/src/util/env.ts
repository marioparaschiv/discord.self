export const ENV = {
	IS_LOCAL_DEV: process.env.NEXT_PUBLIC_LOCAL_DEV === 'true',
	IS_PREVIEW: false,
	PORT: process.env.PORT ?? 3_001,
};
