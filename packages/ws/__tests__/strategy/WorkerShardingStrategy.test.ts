import { GatewayOpcodes } from 'discord-api-types/v10';
import { test, vi, expect, afterEach } from 'vitest';
import {
	WebSocketManager,
	WorkerSendPayloadOp,
	WorkerReceivePayloadOp,
	WorkerShardingStrategy,
	type WorkerReceivePayload,
	type WorkerSendPayload,
	type SessionInfo,
} from '../../src/index.js';
import { mockGatewayInformation } from '../gateway.mock.js';

const mockConstructor = vi.fn();
const mockSend = vi.fn();
const mockTerminate = vi.fn();

const sessionInfo: SessionInfo = {
	shardId: 0,
	shardCount: 2,
	sequence: 123,
	sessionId: 'abc',
	resumeURL: 'wss://ehehe.gg',
};

vi.mock('node:worker_threads', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const { EventEmitter }: typeof import('node:events') = await vi.importActual('node:events');
	class MockWorker extends EventEmitter {
		public constructor(...args: any[]) {
			super();
			mockConstructor(...args);
			// need to delay this by an event loop cycle to allow the strategy to attach a listener
			setImmediate(() => {
				this.emit('online');
				// same deal here
				setImmediate(() => {
					const message: WorkerReceivePayload = {
						op: WorkerReceivePayloadOp.WorkerReady,
					};
					this.emit('message', message);
				});
			});
		}

		public postMessage(message: WorkerSendPayload) {
			switch (message.op) {
				case WorkerSendPayloadOp.Connect: {
					const response: WorkerReceivePayload = {
						op: WorkerReceivePayloadOp.Connected,
						shardId: message.shardId,
					};
					this.emit('message', response);
					break;
				}

				case WorkerSendPayloadOp.Destroy: {
					const response: WorkerReceivePayload = {
						op: WorkerReceivePayloadOp.Destroyed,
						shardId: message.shardId,
					};
					this.emit('message', response);
					break;
				}

				case WorkerSendPayloadOp.Send: {
					if (message.payload.op === GatewayOpcodes.RequestGuildMembers) {
						const sessionFetch: WorkerReceivePayload = {
							op: WorkerReceivePayloadOp.RetrieveSessionInfo,
							shardId: message.shardId,
							nonce: Math.random(),
						};
						this.emit('message', sessionFetch);
					}

					mockSend(message.shardId, message.payload);
					break;
				}

				case WorkerSendPayloadOp.SessionInfoResponse: {
					message.session ??= sessionInfo;

					const session: WorkerReceivePayload = {
						op: WorkerReceivePayloadOp.UpdateSessionInfo,
						shardId: message.session.shardId,
						session: { ...message.session, sequence: message.session.sequence + 1 },
					};
					this.emit('message', session);
					break;
				}

				case WorkerSendPayloadOp.ShardIdentifyResponse: {
					break;
				}

				case WorkerSendPayloadOp.FetchStatus: {
					break;
				}
			}
		}

		public terminate = mockTerminate;
	}

	return {
		Worker: MockWorker,
		workerData: {},
	};
});

afterEach(() => {
	mockConstructor.mockClear();
	mockSend.mockClear();
	mockTerminate.mockClear();
});

test('rejects worker sharding configuration in the single-session fork', () => {
	expect(
		() =>
			new WebSocketManager({
				token: 'A-Very-Fake-Token',
				intents: 0,
				async fetchGatewayInformation() {
					return mockGatewayInformation;
				},
				shardIds: [0, 1],
				retrieveSessionInfo: vi.fn(),
				updateSessionInfo: vi.fn(),
				buildStrategy: (manager) => new WorkerShardingStrategy(manager, { shardsPerWorker: 'all' }),
			}),
	).toThrow('Sharding is not supported in this fork');

	expect(mockConstructor).not.toHaveBeenCalled();
	expect(mockSend).not.toHaveBeenCalled();
	expect(mockTerminate).not.toHaveBeenCalled();
});
