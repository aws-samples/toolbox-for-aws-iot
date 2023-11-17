/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
*
* This function is used to stop a recording by setting the status to aborted.
*
* - recordingId: The id of the recording to be stopped
* - taskId: The id of the task that is currently running
*
*/

// Create the DynamoDB service object
import {ECSClient, StopTaskCommand} from '@aws-sdk/client-ecs'
import {DynamoDB} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, GetCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb'
import {Logger} from '@aws-lambda-powertools/logger';

const REPLAY_TABLE = process.env.REPLAY_TABLE
const CLUSTER_NAME = process.env.CLUSTER_NAME

const ecsClient = new ECSClient()
const dynamoDBClient = new DynamoDB()
const marshallOptions = {
  removeUndefinedValues: true // false, by default.
}
const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false // false, by default.
}
const translateConfig = {marshallOptions, unmarshallOptions}
const docClient = DynamoDBDocumentClient.from(dynamoDBClient, translateConfig)
const logger = new Logger()

async function getReplayData(recordingId, replayId) {
  const command = new GetCommand({
    TableName: REPLAY_TABLE,
    Key: {
      recordingId,
      replayId
    }
  })
  const response = await docClient.send(command)
  if (!response.Item) throw new Error('Invalid recordingId or replayId')
  return response.Item
}

async function stopEcsTask(taskId) {
  const stopContainerCommand = new StopTaskCommand({
    cluster: CLUSTER_NAME,
    task: taskId,
    reason: 'Aborted by user'
  })

  return ecsClient.send(stopContainerCommand)
}

async function updateReplayTable(recordingId, replayId) {
  // Add to replay table
  const updateCommandInput = {
    TableName: REPLAY_TABLE,
    ExpressionAttributeNames: {
      '#ST': 'status'
    },
    ExpressionAttributeValues: {
      ':s': 'ABORTED'
    },
    Key: {
      recordingId,
      replayId
    },
    UpdateExpression: 'SET #ST = :s'
  }

  const updateCommand = new UpdateCommand(updateCommandInput)
  return docClient.send(updateCommand)
}

async function validateInput(recordingId, replayId) {
  if (!recordingId) {
    throw new Error("Required field 'recordingId' missing")
  }
  if (!recordingId.match(/^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$/)) { // UUID with underscores instead of hyphens
    throw new Error('Invalid recordingId')
  }

  if (typeof replayId !== 'number' || typeof (parseInt(replayId)) !== 'number') {
    throw new Error('Invalid replayId')
  }
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  logger.info(event)
  const {recordingId, replayId} = event

  await validateInput(recordingId, replayId)

  const replayData = await getReplayData(recordingId, replayId)
  const taskId = replayData.taskId

  await stopEcsTask(taskId)
  await updateReplayTable(recordingId, replayId)
}
