/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * This lambda function will scan for all recordings and returns them.
 *
 */

// Create the DynamoDB service object
import {DynamoDB} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, ScanCommand} from '@aws-sdk/lib-dynamodb'
import {Logger} from '@aws-lambda-powertools/logger';

const METADATA_TABLE = process.env.METADATA_TABLE

const dynamoDBClient = new DynamoDB()
const docClient = DynamoDBDocumentClient.from(dynamoDBClient)
const logger = new Logger();

async function listRecordings() {
  const scanCommandInput = {
    TableName: METADATA_TABLE,
    ScanIndexForward: true
  }
  const scanCommand = new ScanCommand(scanCommandInput)
  const response = await docClient.send(scanCommand)
  return response.Items
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  const items = await listRecordings()
  logger.info(`Found ${items.length} recordings`)
  return {
    items
  }
}
