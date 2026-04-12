import type { InternalRequest, RawFile } from '../utils/types.js';

/**
 * Leaf-level Discord validation error entry.
 */
export interface DiscordErrorFieldInformation {
	/**
	 * Discord error code for this field entry.
	 */
	code: string;
	/**
	 * Human-readable validation message.
	 */
	message: string;
}

/**
 * Wrapper used by Discord for grouped nested errors.
 */
export interface DiscordErrorGroupWrapper {
	/**
	 * Nested validation errors in this group.
	 */
	_errors: DiscordError[];
}

export type DiscordError =
	| DiscordErrorFieldInformation
	| DiscordErrorGroupWrapper
	| string
	| { [k: string]: DiscordError };

/**
 * Discord REST error response payload.
 */
export interface DiscordErrorData {
	/**
	 * Discord numeric error code.
	 */
	code: number;
	/**
	 * Nested field-level error payload.
	 */
	errors?: DiscordError;
	/**
	 * Top-level Discord error message.
	 */
	message: string;
}

/**
 * OAuth error response payload.
 */
export interface OAuthErrorData {
	/**
	 * OAuth error identifier.
	 */
	error: string;
	/**
	 * Human-readable OAuth error description.
	 */
	error_description?: string;
}

/**
 * Serialized request body information attached to REST errors.
 */
export interface RequestBody {
	/**
	 * Files included in the failed request.
	 */
	files: RawFile[] | undefined;
	/**
	 * JSON payload included in the failed request.
	 */
	json: unknown | undefined;
}

function isErrorGroupWrapper(error: DiscordError): error is DiscordErrorGroupWrapper {
	return Reflect.has(error as Record<string, unknown>, '_errors');
}

function isErrorResponse(error: DiscordError): error is DiscordErrorFieldInformation {
	return typeof Reflect.get(error as Record<string, unknown>, 'message') === 'string';
}

/**
 * Represents an API error returned by Discord
 */
export class DiscordAPIError extends Error {
	public requestBody: RequestBody;

	/**
	 * @param rawError - The error reported by Discord
	 * @param code - The error code reported by Discord
	 * @param status - The status code of the response
	 * @param method - The method of the request that errored
	 * @param url - The url of the request that errored
	 * @param bodyData - The unparsed data for the request that errored
	 */
	public constructor(
		public rawError: DiscordErrorData | OAuthErrorData,
		public code: number | string,
		public status: number,
		public method: string,
		public url: string,
		bodyData: Pick<InternalRequest, 'body' | 'files'>,
	) {
		super(DiscordAPIError.getMessage(rawError));

		this.requestBody = { files: bodyData.files, json: bodyData.body };
	}

	/**
	 * The name of the error
	 */
	public override get name(): string {
		return `${DiscordAPIError.name}[${this.code}]`;
	}

	private static getMessage(error: DiscordErrorData | OAuthErrorData) {
		let flattened = '';
		if ('code' in error) {
			if (error.errors) {
				flattened = [...this.flattenDiscordError(error.errors)].join('\n');
			}

			return error.message && flattened
				? `${error.message}\n${flattened}`
				: error.message || flattened || 'Unknown Error';
		}

		return error.error_description ?? 'No Description';
	}

	private static *flattenDiscordError(obj: DiscordError, key = ''): IterableIterator<string> {
		if (isErrorResponse(obj)) {
			return yield `${key.length ? `${key}[${obj.code}]` : `${obj.code}`}: ${obj.message}`.trim();
		}

		for (const [otherKey, val] of Object.entries(obj)) {
			const nextKey = otherKey.startsWith('_')
				? key
				: key
					? Number.isNaN(Number(otherKey))
						? `${key}.${otherKey}`
						: `${key}[${otherKey}]`
					: otherKey;

			if (typeof val === 'string') {
				yield val;
			} else if (isErrorGroupWrapper(val)) {
				for (const error of val._errors) {
					yield* this.flattenDiscordError(error, nextKey);
				}
			} else {
				yield* this.flattenDiscordError(val, nextKey);
			}
		}
	}
}
