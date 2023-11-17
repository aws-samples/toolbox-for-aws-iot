/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway'

export const customMessageRequestSchema = {
  contentType: 'application/json',
  modelName: 'CustomMessageModel',
  schema: {
    schema: apigateway.JsonSchemaVersion.DRAFT4,
    title: 'Toolbox for AWS IoT Rule Tester schema - Custom Messages',
    type: apigateway.JsonSchemaType.OBJECT,
    properties: {
      sql: { type: apigateway.JsonSchemaType.STRING },
      awsIotSqlVersion: {
        type: apigateway.JsonSchemaType.STRING,
        enum: ['2015-10-08', '2016-03-23']
      },
      message: { type: apigateway.JsonSchemaType.OBJECT },
      userProperties: {
        type: apigateway.JsonSchemaType.ARRAY,
        items: {
          type: apigateway.JsonSchemaType.OBJECT,
          patternProperties: {
            '.{1,}': { type: apigateway.JsonSchemaType.STRING }
          }
        }
      },
      mqttProperties: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          contentType: {
            type: apigateway.JsonSchemaType.STRING
          },
          payloadFormatIndicator: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ['UTF8_DATA', 'UNSPECIFIED_BYTES']
          },
          responseTopic: {
            type: apigateway.JsonSchemaType.STRING
          },
          correlationData: {
            type: apigateway.JsonSchemaType.STRING
          },
          messageExpiry: {
            type: apigateway.JsonSchemaType.STRING
          }
        }
      }
    },
    required: ['sql', 'awsIotSqlVersion', 'message', 'userProperties', 'mqttProperties']
  }
}
