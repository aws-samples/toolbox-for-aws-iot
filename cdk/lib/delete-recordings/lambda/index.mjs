/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {DynamoDB, BatchWriteItemCommand} from '@aws-sdk/client-dynamodb'
import {Logger} from '@aws-lambda-powertools/logger';

const DYNAMODB_BATCH_WRITE_CHUNK_SIZE = 25

const dynamoDBClient = new DynamoDB()
const logger = new Logger()

async function batchDeleteItems(tableName, items) {
  const batchWriteItemCommandInput = {
    RequestItems: {
      [tableName]: items.map(item => ({ DeleteRequest: { Key: item }}))
    }
  }
  const batchWriteItemCommand = new BatchWriteItemCommand(batchWriteItemCommandInput)
  return dynamoDBClient.send(batchWriteItemCommand)
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  const { table, items } = event
  logger.info(`Deleting ${items.length} records from ${table}`)

  for (let i = 0; i < items.length; i += DYNAMODB_BATCH_WRITE_CHUNK_SIZE) {
    const chunk = items.slice(i, i + DYNAMODB_BATCH_WRITE_CHUNK_SIZE);
    const result = await batchDeleteItems(table, chunk)
    if(result.UnprocessedItems) {
      logger.info(result.UnprocessedItems)
    }
  }
}
