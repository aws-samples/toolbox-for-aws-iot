/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export const TOOLBOX_API = "ToolboxAPI";
export const ENDPOINT_TEST_RULE_CUSTOM_MESSAGE = "test-iot-rule/custom-message";
export const ENDPOINT_TEST_RULE_TOPIC_MESSAGE = "test-iot-rule/topic-message";
export const ENDPOINT_START_RECORD_MESSAGES = "record/start";
export const ENDPOINT_STOP_RECORD_MESSAGES = "record/stop";
export const ENDPOINT_DELETE_RECORD_MESSAGES = "record/delete";
export const ENDPOINT_GET_RECORD_MESSAGES = "record";
export const ENDPOINT_GET_REPLAY_MESSAGES = "replay";
export const ENDPOINT_START_REPLAY_MESSAGES = "replay/start";
export const ENDPOINT_STOP_REPLAY_MESSAGES = "replay/stop";

export const MQTTProperties = {
  CONTENT_TYPE: {key: "contentType", label: "Content Type"},
  PAYLOAD_FORMAT_INDICATOR: {key: "payloadFormatIndicator", label: "Payload Format Indicator"},
  RESPONSE_TOPIC: {key: "responseTopic", label: "Response Topic"},
  CORRELATION_DATA: {key: "correlationData", label: "Correlation Data"},
  MESSAGE_EXPIRY: {key: "messageExpiry", label: "Message Expiry"},
}

export const PROGRESS_STATUS = {
  PREPARING: 'PREPARING',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
  ABORTED: 'ABORTED',
  FAILED: 'FAILED',
  DELETING: 'DELETING'
}