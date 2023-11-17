/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 * This lambda function will scan for all replays and returns them.
 *
 */

// Create the DynamoDB service object
import {DynamoDB} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, ScanCommand} from '@aws-sdk/lib-dynamodb'
import {Logger} from '@aws-lambda-powertools/logger';

const REPLAY_TABLE = process.env.REPLAY_TABLE

const dynamoDBClient = new DynamoDB()
const docClient = DynamoDBDocumentClient.from(dynamoDBClient)
const logger = new Logger()

async function listReplays() {
  const scanCommandInput = {
    TableName: REPLAY_TABLE,
    ScanIndexForward: false, // descending order
    ProjectionExpression: '#recordingId,#recordingName,#replayId,#status,#topicPrefix',
    ExpressionAttributeNames: {
      '#recordingId': 'recordingId',
      '#recordingName': 'recordingName',
      '#replayId': 'replayId',
      '#status': 'status',
      '#topicPrefix': 'topicPrefix'
    }
  }
  const scanCommand = new ScanCommand(scanCommandInput)
  const response = await docClient.send(scanCommand)
  return response.Items
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  const items = await listReplays()
  logger.info(`Found ${items.length} replays`)
  return {
    items
  }
}
