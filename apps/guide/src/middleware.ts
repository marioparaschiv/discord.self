import { NextResponse, type NextRequest } from 'next/server';

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

function stripBasePath(pathname: string): string {
	if (!GUIDE_BASE_PATH) {
		return pathname;
	}

	if (pathname === GUIDE_BASE_PATH) {
		return '/';
	}

	if (pathname.startsWith(`${GUIDE_BASE_PATH}/`)) {
		return pathname.slice(GUIDE_BASE_PATH.length);
	}

	return pathname;
}

function withBasePath(pathname: string): string {
	if (!GUIDE_BASE_PATH) {
		return pathname;
	}

	if (pathname === '/') {
		return GUIDE_BASE_PATH;
	}

	return `${GUIDE_BASE_PATH}${pathname}`;
}

export function middleware(request: NextRequest) {
	const pathname = stripBasePath(request.nextUrl.pathname);

	if (
		pathname.startsWith('/_next') ||
		pathname.startsWith('/api') ||
		pathname.startsWith('/og') ||
		pathname.startsWith('/_static') ||
		/\.[^/]+$/.test(pathname)
	) {
		return NextResponse.next();
	}

	// TODO: Remove this eventually
	if (!GUIDE_BASE_PATH && pathname.startsWith('/guide/')) {
		const newUrl = request.nextUrl.clone();
		newUrl.pathname = pathname.replace('/guide/', '/');
		return NextResponse.redirect(newUrl);
	}

	// Redirect old urls to /client
	if (!pathname.startsWith('/client') && !pathname.startsWith('/voice')) {
		const newUrl = request.nextUrl.clone();
		newUrl.pathname = withBasePath(`/client${pathname}`);
		return NextResponse.redirect(newUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next|api|og|.*\\..*|_static).*)'],
};
