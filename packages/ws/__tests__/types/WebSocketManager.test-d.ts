import type { AsyncEventEmitter } from '@vladfrangu/async_event_emitter';
import { expectTypeOf } from 'vitest';
import type { ManagerShardEventsMap, WebSocketShardEventsMap, WebSocketManager } from '../../src/index.js';

declare const manager: WebSocketManager;
declare const eventMap: ManagerShardEventsMap;

expectTypeOf(eventMap).toEqualTypeOf<WebSocketShardEventsMap>();
expectTypeOf(manager).toMatchTypeOf<AsyncEventEmitter<WebSocketShardEventsMap>>();
