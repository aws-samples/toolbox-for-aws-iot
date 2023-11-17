/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
*
* This function will be invoked by the API Gateway and deletes rule for an existing recording.#
*
*
* The Step Function will receive the following parameters:
* - recordingid: name of the recording rule
*

{
    "recordingId": "mytopicbla_lks3hs995ol941azao",
}

*/

// Create the DynamoDB service object
import {DynamoDB} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, UpdateCommand} from '@aws-sdk/lib-dynamodb'
import {DeleteTopicRuleCommand, IoTClient} from '@aws-sdk/client-iot'
import {Logger} from '@aws-lambda-powertools/logger';

const METADATA_TABLE = process.env.METADATA_TABLE
const TOOLBOX_IOT_RULE_PREFIX = process.env.TOOLBOX_IOT_RULE_PREFIX

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
const iotClient = new IoTClient()
const logger = new Logger()

async function deleteTopicRule(recordingId) {
  try {
    const deleteTopicCommandInput = {
      ruleName: `${TOOLBOX_IOT_RULE_PREFIX}_record_${recordingId}`
    }
    const deleteCommand = new DeleteTopicRuleCommand(deleteTopicCommandInput)
    await iotClient.send(deleteCommand)
  } catch (err) {
    console.warn(`Rule does not exist: ${err}`)
  }
}

async function updateMetadataTable(recordingId, stopRecordTime) {
  // update the item in the dynamodb recording table
  const updateCommandInput = {
    TableName: METADATA_TABLE,
    ExpressionAttributeNames: {
      '#ST': 'status',
      '#SA': 'stoppedAt'
    },
    ExpressionAttributeValues: {
      ':s': 'FINISHED',
      ':sa': stopRecordTime
    },
    Key: {
      recordingId
    },
    UpdateExpression: 'SET #ST = :s, #SA = :sa',
    ConditionExpression: 'attribute_not_exists(#SA)'
  }

  const updateCommand = new UpdateCommand(updateCommandInput)
  await docClient.send(updateCommand)
}

async function validateInput(recordingId) {
  if (!recordingId) {
    throw new Error("Required field 'recordingId' missing")
  }
  if (!recordingId.match(/^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$/)) { // UUID with underscores instead of hyphens
    throw new Error('Invalid recordingId')
  }
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  logger.info(event)
  const {recordingId} = event

  await validateInput(recordingId)

  const stopRecordTime = Date.now()

  await deleteTopicRule(recordingId)
  await updateMetadataTable(recordingId, stopRecordTime)
}
