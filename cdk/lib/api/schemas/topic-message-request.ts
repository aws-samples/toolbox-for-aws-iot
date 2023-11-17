/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as apigateway from 'aws-cdk-lib/aws-apigateway'

export const topicMessageRequestSchema = {
  contentType: 'application/json',
  modelName: 'TopicMessageModel',
  schema: {
    schema: apigateway.JsonSchemaVersion.DRAFT4,
    title: 'Toolbox for AWS IoT Rule Tester schema - Topic Messages',
    type: apigateway.JsonSchemaType.OBJECT,
    properties: {
      sql: { type: apigateway.JsonSchemaType.STRING },
      awsIotSqlVersion: {
        type: apigateway.JsonSchemaType.STRING,
        enum: ['2015-10-08', '2016-03-23']
      }
    },
    required: ['sql', 'awsIotSqlVersion']
  }
}
