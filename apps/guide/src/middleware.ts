import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
	// TODO: Remove this eventually
	if (request.nextUrl.pathname.startsWith('/guide/')) {
		const newUrl = request.nextUrl.clone();
		newUrl.pathname = newUrl.pathname.replace('/guide/', '/');
		return NextResponse.redirect(newUrl);
	}

	// Redirect old urls to /client
	if (!request.nextUrl.pathname.startsWith('/client') && !request.nextUrl.pathname.startsWith('/voice')) {
		const newUrl = request.nextUrl.clone();
		newUrl.pathname = `/client${newUrl.pathname}`;
		return NextResponse.redirect(newUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next|api|og|.*\\..*|_static).*)'],
};
