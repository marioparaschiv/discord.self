import type { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import type { Collection } from '@discord.self/collection';
import type { DiscordIdentity } from '@discord.self/identity';
import type { Awaitable, RawFile } from '@discord.self/util';
import type { Agent, Dispatcher, RequestInit, BodyInit, Response } from 'undici';
import type { IHandler } from '../interfaces/Handler.js';

/**
 * REST client event payload tuples.
 */
export interface RestEvents {
	/**
	 * Emitted after inactive request handlers are swept.
	 */
	handlerSweep: [sweptHandlers: Collection<string, IHandler>];
	/**
	 * Emitted after stale route hash entries are swept.
	 */
	hashSweep: [sweptHashes: Collection<string, HashData>];
	/**
	 * Emitted when invalid request warning thresholds are reached.
	 */
	invalidRequestWarning: [invalidRequestInfo: InvalidRequestWarningData];
	/**
	 * Emitted when a request is rate-limited.
	 */
	rateLimited: [rateLimitInfo: RateLimitData];
	/**
	 * Emitted after a response is received.
	 */
	response: [request: APIRequest, response: ResponseLike];
	/**
	 * Emitted for debug log messages from the REST client.
	 */
	restDebug: [info: string];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
/**
 * Event map used by REST event emitters.
 */
export interface RestEventsMap extends RestEvents {}

/**
 * Options to be passed when creating the REST instance
 */
export interface RESTOptions {
	/**
	 * The agent to set globally
	 */
	agent: Dispatcher | null;
	/**
	 * The base api path, without version
	 *
	 * @defaultValue `'https://discord.com/api'`
	 */
	api: string;
	/**
	 * Browser-style metadata to generate for requests in self-account mode.
	 *
	 * Set this to `null` to disable the generated browser metadata headers.
	 *
	 * @defaultValue `{}`
	 */
	browser: RESTBrowserMetadata | null;
	/**
	 * The cdn path
	 *
	 * @defaultValue `'https://cdn.discordapp.com'`
	 */
	cdn: string;
	/**
	 * How many requests to allow sending per second (Infinity for unlimited, 50 for the standard global limit used by Discord)
	 *
	 * @defaultValue `50`
	 */
	globalRequestsPerSecond: number;
	/**
	 * The amount of time in milliseconds that passes between each hash sweep. (defaults to 1h)
	 *
	 * @defaultValue `3_600_000`
	 */
	handlerSweepInterval: number;
	/**
	 * The maximum amount of time a hash can exist in milliseconds without being hit with a request (defaults to 24h)
	 *
	 * @defaultValue `86_400_000`
	 */
	hashLifetime: number;
	/**
	 * The amount of time in milliseconds that passes between each hash sweep. (defaults to 4h)
	 *
	 * @defaultValue `14_400_000`
	 */
	hashSweepInterval: number;
	/**
	 * Additional headers to send for all API requests
	 *
	 * @defaultValue `{}`
	 */
	headers: Record<string, string>;
	/**
	 * Shared Discord identity used to generate cloaked request headers.
	 *
	 * When provided, this takes precedence over the `browser` metadata option.
	 *
	 * @defaultValue `null`
	 */
	identity: DiscordIdentity | null;
	/**
	 * The number of invalid REST requests (those that return 401, 403, or 429) in a 10 minute window between emitted warnings (0 for no warnings).
	 * That is, if set to 500, warnings will be emitted at invalid request number 500, 1000, 1500, and so on.
	 *
	 * @defaultValue `0`
	 */
	invalidRequestWarningInterval: number;
	/**
	 * The method called to perform the actual HTTP request given a url and web `fetch` options
	 * For example, to use global fetch, simply provide `makeRequest: fetch`
	 */
	makeRequest(url: string, init: RequestInit): Promise<ResponseLike>;
	/**
	 * The media proxy path
	 *
	 * @defaultValue `'https://media.discordapp.net'`
	 */
	mediaProxy: string;
	/**
	 * The extra offset to add to rate limits in milliseconds
	 *
	 * @defaultValue `50`
	 */
	offset: GetRateLimitOffsetFunction | number;
	/**
	 * Determines how rate limiting and pre-emptive throttling should be handled.
	 * When an array of strings, each element is treated as a prefix for the request route
	 * (e.g. `/channels` to match any route starting with `/channels` such as `/channels/:id/messages`)
	 * for which to throw {@link RateLimitError}s. All other request routes will be queued normally
	 *
	 * @defaultValue `null`
	 */
	rejectOnRateLimit: RateLimitQueueFilter | string[] | null;
	/**
	 * The number of retries for errors with the 500 code, or errors
	 * that timeout
	 *
	 * @defaultValue `3`
	 */
	retries: number;
	/**
	 * The time to exponentially add before retrying a 5xx or aborted request
	 *
	 * @defaultValue `0`
	 */
	retryBackoff: GetRetryBackoffFunction | number;
	/**
	 * The time to wait in milliseconds before a request is aborted
	 *
	 * @defaultValue `15_000`
	 */
	timeout: GetTimeoutFunction | number;
	/**
	 * Extra information to add to the user agent
	 *
	 * @defaultValue DefaultUserAgentAppendix
	 */
	userAgentAppendix: string;
	/**
	 * The version of the API to use
	 *
	 * @defaultValue `'10'`
	 */
	version: string;
}

/**
 * Data emitted on `RESTEvents.RateLimited`
 */
export interface RateLimitData {
	/**
	 * Whether the rate limit that was reached was the global limit
	 */
	global: boolean;
	/**
	 * The bucket hash for this request
	 */
	hash: string;
	/**
	 * The amount of requests we can perform before locking requests
	 */
	limit: number;
	/**
	 * The major parameter of the route
	 *
	 * For example, in `/channels/x`, this will be `x`.
	 * If there is no major parameter (e.g: `/bot/gateway`) this will be `global`.
	 */
	majorParameter: string;
	/**
	 * The HTTP method being performed
	 */
	method: string;
	/**
	 * The time, in milliseconds, that will need to pass before this specific request can be retried
	 */
	retryAfter: number;
	/**
	 * The route being hit in this request
	 */
	route: string;
	/**
	 * The scope of the rate limit that was hit.
	 *
	 * This can be `user` for rate limits that are per client, `global` for rate limits that affect all clients or `shared` for rate limits that
	 * are shared per resource.
	 */
	scope: 'global' | 'shared' | 'user';
	/**
	 * The time, in milliseconds, that will need to pass before the sublimit lock for the route resets, and requests that fall under a sublimit
	 * can be retried
	 *
	 * This is only present on certain sublimits, and `0` otherwise
	 */
	sublimitTimeout: number;
	/**
	 * The time, in milliseconds, until the route's request-lock is reset
	 */
	timeToReset: number;
	/**
	 * The full URL for this request
	 */
	url: string;
}

/**
 * A function that determines whether the rate limit hit should throw an Error
 */
export type RateLimitQueueFilter = (rateLimitData: RateLimitData) => Awaitable<boolean>;

/**
 * A function that determines the rate limit offset for a given request.
 */
export type GetRateLimitOffsetFunction = (route: string) => number;

/**
 * A function that determines the backoff for a retry for a given request.
 *
 * @param route - The route that has encountered a server-side error
 * @param statusCode - The status code received or `null` if aborted
 * @param retryCount - The number of retries that have been attempted so far. The first call will be `0`
 * @param requestBody - The body that was sent with the request
 * @returns The delay for the current request or `null` to throw an error instead of retrying
 */
export type GetRetryBackoffFunction = (
	route: string,
	statusCode: number | null,
	retryCount: number,
	requestBody: unknown,
) => number | null;

/**
 * A function that determines the timeout for a given request.
 *
 * @param route - The route that is being processed
 * @param body - The body that will be sent with the request
 */
export type GetTimeoutFunction = (route: string, body: unknown) => number;

/**
 * Metadata describing an outgoing API request.
 */
export interface APIRequest {
	/**
	 * The data that was used to form the body of this request
	 */
	data: HandlerRequestData;
	/**
	 * The HTTP method used in this request
	 */
	method: string;
	/**
	 * Additional HTTP options for this request
	 */
	options: RequestInit;
	/**
	 * The full path used to make the request
	 */
	path: RouteLike;
	/**
	 * The number of times this request has been attempted
	 */
	retries: number;
	/**
	 * The API route identifying the ratelimit for this request
	 */
	route: string;
}

/**
 * Minimal fetch-like response shape returned by REST request handlers.
 */
export interface ResponseLike extends Pick<
	Response,
	'arrayBuffer' | 'bodyUsed' | 'headers' | 'json' | 'ok' | 'status' | 'statusText' | 'text'
> {
	/**
	 * Stream body when available from the underlying response.
	 */
	body: Readable | ReadableStream | null;
}

/**
 * Payload emitted for invalid request warning events.
 */
export interface InvalidRequestWarningData {
	/**
	 * Number of invalid requests that have been made in the window
	 */
	count: number;
	/**
	 * Time in milliseconds remaining before the count resets
	 */
	remainingTime: number;
}

export type { RawFile } from '@discord.self/util';

/**
 * Build metadata used to populate browser identity headers.
 */
export interface RESTBuildMetadata {
	/**
	 * Discord web client build number.
	 */
	clientBuildNumber?: number;
	/**
	 * Discord desktop host version.
	 */
	hostVersion?: string;
	/**
	 * Discord desktop native build number.
	 */
	nativeBuildNumber?: number;
}

/**
 * Browser metadata used to build Discord-style client headers.
 */
export interface RESTBrowserMetadata {
	/**
	 * Value for the `Accept-Language` header.
	 */
	acceptLanguage?: string;
	/**
	 * Browser family name.
	 */
	browser?: string;
	/**
	 * Browser version string.
	 */
	browserVersion?: string;
	/**
	 * Optional explicit Discord build metadata override.
	 */
	buildMetadata?: RESTBuildMetadata;
	/**
	 * Whether the browser identity should be marked as mobile.
	 */
	isMobile?: boolean;
	/**
	 * Locale to emit in Discord locale headers.
	 */
	locale?: string;
	/**
	 * Operating system name.
	 */
	os?: string;
	/**
	 * Operating system version string.
	 */
	osVersion?: string;
	/**
	 * `httpcloak` browser preset used during header probing.
	 */
	preset?: string;
	/**
	 * Probe URL used for discovering cloaked browser headers.
	 */
	probeUrl?: string;
	/**
	 * Discord release channel in generated super-properties.
	 */
	releaseChannel?: string;
	/**
	 * Value for the `Sec-CH-UA` header.
	 */
	secChUa?: string;
	/**
	 * Value for the `Sec-CH-UA-Mobile` header.
	 */
	secChUaMobile?: '?0' | '?1';
	/**
	 * Value for the `Sec-CH-UA-Platform` header.
	 */
	secChUaPlatform?: string;
	/**
	 * Additional super-properties entries, or `false` to disable the header.
	 */
	superProperties?: Record<string, unknown> | false;
	/**
	 * Timezone used in Discord timezone headers.
	 */
	timezone?: string;
	/**
	 * Value for the `User-Agent` header.
	 */
	userAgent?: string;
}

/**
 * Authorization data for an authenticated request.
 */
export interface AuthData {
	/**
	 * The authorization token to use for this request
	 */
	token: string;
}

/**
 * Represents possible data to be given to an endpoint
 */
export interface RequestData {
	/**
	 * Whether to append JSON data to form data instead of `payload_json` when sending files
	 */
	appendToFormData?: boolean;
	/**
	 * Alternate authorization data to use for this request only, or `false` to disable the Authorization header.
	 * When making a request to a route that includes a token (such as interactions or webhooks), set to `false`
	 * to avoid accidentally unsetting the instance token if a 401 is encountered.
	 *
	 * @defaultValue `true`
	 */
	auth?: AuthData | boolean | undefined;
	/**
	 * The body to send to this request.
	 * If providing as BodyInit, set `passThroughBody: true`
	 */
	body?: BodyInit | unknown;
	/**
	 * The {@link https://undici.nodejs.org/#/docs/api/Agent | Agent} to use for the request.
	 */
	dispatcher?: Agent;
	/**
	 * Files to be attached to this request
	 */
	files?: RawFile[] | undefined;
	/**
	 * Additional headers to add to this request
	 */
	headers?: Record<string, string>;
	/**
	 * Whether to pass-through the body property directly to `fetch()`.
	 * <warn>This only applies when files is NOT present</warn>
	 */
	passThroughBody?: boolean;
	/**
	 * Query string parameters to append to the called endpoint
	 */
	query?: URLSearchParams;
	/**
	 * Reason to show in the audit logs
	 */
	reason?: string | undefined;
	/**
	 * The signal to abort the queue entry or the REST call, where applicable
	 */
	signal?: AbortSignal | undefined;
	/**
	 * If this request should be versioned
	 *
	 * @defaultValue `true`
	 */
	versioned?: boolean;
}

/**
 * Possible headers for an API call
 */
/**
 * Possible headers for an API call.
 */
export interface RequestHeaders {
	/**
	 * Preferred response languages.
	 */
	'Accept-Language'?: string;
	/**
	 * Authorization header value.
	 */
	Authorization?: string;
	/**
	 * Browser brand/version client hints.
	 */
	'Sec-CH-UA'?: string;
	/**
	 * Browser mobile client hint.
	 */
	'Sec-CH-UA-Mobile'?: '?0' | '?1';
	/**
	 * Browser platform client hint.
	 */
	'Sec-CH-UA-Platform'?: string;
	/**
	 * Request user agent string.
	 */
	'User-Agent'?: string;
	/**
	 * URL-encoded Discord audit log reason.
	 */
	'X-Audit-Log-Reason'?: string;
	/**
	 * Discord locale override.
	 */
	'X-Discord-Locale'?: string;
	/**
	 * Discord timezone override.
	 */
	'X-Discord-Timezone'?: string;
	/**
	 * Base64-encoded Discord super-properties.
	 */
	'X-Super-Properties'?: string;
}

/**
 * Possible API methods to be used when doing requests
 */
export enum RequestMethod {
	Delete = 'DELETE',
	Get = 'GET',
	Patch = 'PATCH',
	Post = 'POST',
	Put = 'PUT',
}

export type RouteLike = `/${string}`;

/**
 * Internal request options
 */
export interface InternalRequest extends RequestData {
	/**
	 * Fully resolved route path used for this request.
	 */
	fullRoute: RouteLike;
	/**
	 * HTTP method used for this request.
	 */
	method: RequestMethod;
}

/**
 * Handler-focused request payload used for queue processing.
 */
export interface HandlerRequestData extends Pick<InternalRequest, 'body' | 'files' | 'signal'> {
	/**
	 * Resolved authorization header value, or `false` to omit it.
	 */
	auth: boolean | string;
}

/**
 * Parsed route data for an endpoint
 */
export interface RouteData {
	/**
	 * Bucket route key used for Discord rate-limit bucketing.
	 */
	bucketRoute: string;
	/**
	 * Major parameter extracted from the request route.
	 */
	majorParameter: string;
	/**
	 * Original route template before normalization.
	 */
	original: RouteLike;
}

/**
 * Represents a hash and its associated fields
 */
export interface HashData {
	/**
	 * Timestamp of the most recent access for this hash.
	 */
	lastAccess: number;
	/**
	 * Discord-provided hash string for this bucket.
	 */
	value: string;
}
