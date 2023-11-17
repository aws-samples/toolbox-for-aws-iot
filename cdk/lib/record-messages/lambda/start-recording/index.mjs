/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
*
* This function will be invoked by the API Gateway and creates a new table and rule for a non-existing recording.
*
* The Step Function will receive the following parameters:
* - topic: the topic of the message to be recorded
* - recordingName: name of the recording
*
* topic needs to be 'my/topic/bla' and not '/my/topic/bla'
*

{
  "topic": "my/topic/bla",
  "recordingName": "my_recordingName"
}

*/

// Create the DynamoDB service object
import {DynamoDB} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, PutCommand} from '@aws-sdk/lib-dynamodb'
import {CreateTopicRuleCommand, IoTClient} from '@aws-sdk/client-iot'
import {randomUUID} from 'crypto'
import {Logger} from '@aws-lambda-powertools/logger';

const RECORDING_TABLE = process.env.RECORDING_TABLE
const METADATA_TABLE = process.env.METADATA_TABLE
const TOOLBOX_IOT_RULE_PREFIX = process.env.TOOLBOX_IOT_RULE_PREFIX
const IOT_RULE_ARN = process.env.IOT_RULE_ARN
const IOT_CORE_MAX_LEVELS = 7

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


async function createIoTRule(recordingId, topic) {
  const topicRule = new CreateTopicRuleCommand({
    ruleName: `${TOOLBOX_IOT_RULE_PREFIX}_record_${recordingId}`,
    topicRulePayload: {
      actions: [
        {
          dynamoDBv2: {
            putItem: {
              tableName: RECORDING_TABLE
            },
            roleArn: IOT_RULE_ARN
          }
        }
      ],
      sql: `SELECT '${recordingId}' AS recordingId, timestamp () as timestamp, topic() as topic, encode(*, 'base64') as message, encode(get_user_properties(), 'base64') as userProperties, encode({
                'contentType': get_mqtt_property('content_type'), 'payloadFormatIndicator': get_mqtt_property('format_indicator'), 'responseTopic': get_mqtt_property('response_topic'), 'correlationData': get_mqtt_property('correlation_data'), }, 'base64') as mqttProperties
            FROM '${topic}'`,
      awsIotSqlVersion: '2016-03-23',
      description: 'Toolbox for AWS IoT: Recording from IoT topic and insert to DynamoDB'
    }
  })

  return iotClient.send(topicRule)
}

async function createMetadataRecord({recordingId, recordingName, topic, startRecordTime}) {
  const metadataTableItem = {
    recordingId,
    recordingName,
    topic,
    status: 'IN_PROGRESS',
    createdAt: startRecordTime
  }

  // create a new entry in the dynamodb table "recording-table"
  const metadataTableCommand = new PutCommand({
    TableName: METADATA_TABLE,
    Item: metadataTableItem
  })

  await docClient.send(metadataTableCommand)
  return metadataTableItem
}

async function validateInput(recordingName, topic) {
  if (!recordingName) {
    throw new Error("Required field 'recordingName' missing")
  }

  if (!topic) {
    throw new Error("Required field 'topic' missing")
  }
  if (topic.split(/\//g).length > IOT_CORE_MAX_LEVELS) {
    throw new Error(`Invalid topic. The maximum number of forward slashes (/) in the MQTT topic name for AWS IoT Core is ${IOT_CORE_MAX_LEVELS}.`)
  }
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  logger.info(event)
  const {recordingName, topic} = event
  const recordingId = randomUUID().replaceAll('-', '_')
  const startRecordTime = Date.now()

  await validateInput(recordingName, topic)

  await createIoTRule(recordingId, topic)
  return await createMetadataRecord({recordingId, recordingName, topic, startRecordTime})
}
