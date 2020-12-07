/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BrokerMessage } from "./BrokerMessage";
import { BrokerAuthenticationResult, AccessTokenEntity, IdTokenEntity, AccountEntity, CacheManager, AuthenticationResult } from "@azure/msal-common";
import { InteractionType, BrokerMessageType } from "../utils/BrowserConstants";
import { CacheRecord } from "@azure/msal-common/dist/src/cache/entities/CacheRecord";
import { BrowserCacheManager } from "../cache/BrowserCacheManager";

export class BrokerAuthResponse extends BrokerMessage {
    public interactionType: InteractionType;
    public result: BrokerAuthenticationResult;
    public error: Error;

    constructor(interactionType: InteractionType, authResult: BrokerAuthenticationResult, authError?: Error) {
        super(BrokerMessageType.AUTH_RESULT);
        this.interactionType = interactionType;
        this.result = authResult;
        this.error = authError;
    }

    static validate(message: MessageEvent): BrokerAuthResponse | null {
        if (message.data &&
            message.data.messageType === BrokerMessageType.AUTH_RESULT &&
            message.data.interactionType &&
            (message.data.result || message.data.error)) {

            // TODO: verify version compat

            return new BrokerAuthResponse(message.data.interactionType, message.data.result);
        }

        return null;
    }

    static processBrokerResponse(brokerAuthResultMessage: MessageEvent, browserStorage: BrowserCacheManager): AuthenticationResult {
        const brokerAuthResult = BrokerAuthResponse.validate(brokerAuthResultMessage);
        if (brokerAuthResult.error) {
            throw brokerAuthResult.error;
        }
        const accessTokenEntity: AccessTokenEntity = new AccessTokenEntity();
        const idTokenEntity: IdTokenEntity = new IdTokenEntity();
        const accountEntity: AccountEntity = new AccountEntity();

        const tokensToCache = brokerAuthResult.result.tokensToCache;
        const cacheRecord: CacheRecord = {
            accessToken: CacheManager.toObject(tokensToCache.accessToken, accessTokenEntity) as AccessTokenEntity,
            idToken: CacheManager.toObject(tokensToCache.idToken, idTokenEntity) as IdTokenEntity,
            account: CacheManager.toObject(tokensToCache.account, accountEntity) as AccountEntity,
            refreshToken: null,
            appMetadata: null
        };
        browserStorage.saveCacheRecord(cacheRecord);
        delete brokerAuthResult.result.tokensToCache;
        return {
            ...brokerAuthResult.result
        };
    }
}
