/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/*
*
* Inputs:
* - recordingId: The recording to replay
* - replayId: The replay id to track
* - topicPrefix: The prefix of the topic to publish to. i.e. "replay". Replay to original topic if unspecified
*/

// Create the DynamoDB service object
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { IoTDataPlaneClient, PublishCommand } from '@aws-sdk/client-iot-data-plane'

const REPLAY_TABLE = process.env.REPLAY_TABLE
const RECORDING_TABLE = process.env.RECORDING_TABLE

// create the dynamo db client
const dynamoDBClient = new DynamoDB()
const docClient = DynamoDBDocumentClient.from(dynamoDBClient)

// create the iot data client
const iotData = new IoTDataPlaneClient()

async function updateReplayStatus (recordingId, replayId, status) {
  const updateReplayStatusCommand = new UpdateCommand({
    TableName: REPLAY_TABLE,
    ExpressionAttributeNames: {
      '#ST': 'status'
    },
    ExpressionAttributeValues: {
      ':s': status
    },
    Key: {
      recordingId,
      replayId
    },
    UpdateExpression: 'SET #ST = :s'
  })
  return docClient.send(updateReplayStatusCommand)
}

async function publishMessage (topicPrefix, item) {
  const topic = topicPrefix ? `${topicPrefix}/${item.topic}` : item.topic

  const mqttProperties = item.mqttProperties ? JSON.parse(Buffer.from(item.mqttProperties, 'base64').toString('ascii')) : {}

  const publishCommandInput = {
    topic,
    qos: 0,
    payload: Buffer.from(item.message, 'base64').toString('utf-8'),
    ...mqttProperties
  }
  if (item.userProperties) publishCommandInput.userProperties = Buffer.from(item.userProperties, 'base64').toString('utf-8')

  const publishCommand = new PublishCommand(publishCommandInput)

  return iotData.send(publishCommand)
}

export const handler = async ({ recordingId, replayId, topicPrefix }) => {
  // create the params object

  const params = {
    TableName: RECORDING_TABLE,
    KeyConditionExpression:
      'recordingId = :ri',
    ExpressionAttributeValues: {
      ':ri': recordingId
    },
    ScanIndexForward: true,
    Limit: 200
  }

  console.log(`Replaying recording: ${recordingId}, Replay ID: ${replayId}. Topic Prefix: ${topicPrefix}`)

  try {
    let totalMsgCounter = 0
    await updateReplayStatus(recordingId, replayId, 'IN_PROGRESS')

    let data = await docClient.send(new QueryCommand(params))

    // calculate the difference of an item and the next item in data.Items
    for (let i = 0; i < data.Items.length; i++) {
      totalMsgCounter++
      const item = data.Items[i]

      if (i === data.Items.length - 1) {
        // check the data for pagination and if true, reset the loop
        if (data.LastEvaluatedKey) {
          params.ExclusiveStartKey = data.LastEvaluatedKey
          data = await docClient.send(new QueryCommand(params))
          console.log(`Replayed ${totalMsgCounter} so far. Additional messages available, continuing.`)
          i = -1
        } else {
          // Last message, publish directly
          await publishMessage(topicPrefix, item)
          break
        }
      }
      await publishMessage(topicPrefix, item)

      const nextItem = data.Items[i + 1]
      const difference = (nextItem.timestamp - item.timestamp)

      // sleep for the next item
      await new Promise(r => setTimeout(r, difference))
    }

    await updateReplayStatus(recordingId, replayId, 'FINISHED')
    console.log(`Replayed ${totalMsgCounter} messages in total. No further messages available, replay finished.`)

  } catch (err) {
    console.log(err)
    await updateReplayStatus(recordingId, replayId, 'FAILED')
  }

  return {
    statusCode: 200,
    body: JSON.stringify('Done')
  }
}
