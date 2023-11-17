/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {ECSClient, RegisterTaskDefinitionCommand, RunTaskCommand} from '@aws-sdk/client-ecs'
import {DynamoDB} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient, GetCommand, PutCommand} from '@aws-sdk/lib-dynamodb'
import {Logger} from '@aws-lambda-powertools/logger';

const REPLAY_TABLE = process.env.REPLAY_TABLE
const METADATA_TABLE = process.env.METADATA_TABLE
const RECORDING_TABLE = process.env.RECORDING_TABLE
const IMAGE_NAME = process.env.IMAGE_NAME
const ECS_TASK_ROLE = process.env.ECS_TASK_ROLE
const ECS_EXEC_ROLE = process.env.ECS_EXEC_ROLE
const CLUSTER_NAME = process.env.CLUSTER_NAME
const PRIVATE_SUBNET = process.env.PRIVATE_SUBNET
const SECURITY_GROUP = process.env.SECURITY_GROUP
const TOOLBOX_ECS_TASK_PREFIX = process.env.TOOLBOX_ECS_TASK_PREFIX
const AWS_REGION = process.env.AWS_REGION

const IOT_CORE_MAX_LEVELS = 7 // max number of slashes in an MQTT topic

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

async function getRecordingMetadata(recordingId) {
  const command = new GetCommand({
    TableName: METADATA_TABLE,
    Key: {
      recordingId
    }
  })
  const response = await docClient.send(command)
  if (!response.Item) throw new Error('Invalid recordingId')
  return response.Item
}

async function startEcsTask(containerArgs, taskFamily) {
  const registerInput = {
    containerDefinitions: [
      {
        name: 'replay-handler',
        command: [
          'node',
          'server.mjs', '--input-b64', containerArgs
        ],
        environment: [
          {
            name: 'RECORDING_TABLE',
            value: RECORDING_TABLE
          }, {
            name: 'REPLAY_TABLE',
            value: REPLAY_TABLE
          }],
        cpu: 0,
        essential: true,
        image: IMAGE_NAME,
        logConfiguration: {
          logDriver: 'awslogs',
          options: {
            'awslogs-group': 'firelens-container',
            'awslogs-region': AWS_REGION,
            'awslogs-create-group': 'true',
            'awslogs-stream-prefix': 'firelens'
          }
        }

      }
    ],
    family: taskFamily,
    taskRoleArn: ECS_TASK_ROLE,
    executionRoleArn: ECS_EXEC_ROLE,
    networkMode: 'awsvpc',
    cpu: '256',
    memory: '512',
    runtimePlatform: {
      cpuArchitecture: 'ARM64',
      operatingSystemFamily: 'LINUX'
    },
    volumes: []
  }

  const registerCommand = new RegisterTaskDefinitionCommand(registerInput)
  const registerResponse = await ecsClient.send(registerCommand)

  const input = {
    cluster: CLUSTER_NAME,
    taskDefinition: registerResponse.taskDefinition.taskDefinitionArn,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: [
          PRIVATE_SUBNET
        ],
        securityGroups: [
          SECURITY_GROUP
        ],
        assignPublicIp: 'DISABLED'
      }
    }

  }

  const runCommand = new RunTaskCommand(input)
  const runResponse = await ecsClient.send(runCommand)
  return runResponse.tasks[0].taskArn
}

async function updateReplayTable({recordingId, recordingName, replayId, taskId, topicPrefix}) {
  // Add to replay table
  const replayTableItem = {
    recordingId,
    recordingName,
    replayId,
    status: 'PREPARING',
    taskId,
    topicPrefix
  }

  const replayTableCommand = new PutCommand({
    TableName: REPLAY_TABLE,
    Item: replayTableItem
  })

  return docClient.send(replayTableCommand)
}

async function validateInput(recordingId, topicPrefix) {
  if (!recordingId) {
    throw new Error("Required field 'recordingId' missing")
  }
  if (!recordingId.match(/^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$/)) { // UUID with underscores instead of hyphens
    throw new Error('Invalid recordingId')
  }

  if (topicPrefix.match(/[+#$*]/)) {
    throw new Error('Invalid topic prefix. Wildcards (+,*,#) and $ are not allowed')
  }
  if (topicPrefix.split(/\//g).length > IOT_CORE_MAX_LEVELS) {
    throw new Error(`Invalid topic prefix. The maximum number of forward slashes (/) in the MQTT topic name for AWS IoT Core is ${IOT_CORE_MAX_LEVELS}. Therefore the topic prefix can contain a maximum of ${IOT_CORE_MAX_LEVELS - 1} forward slashes`)
  }
}

export const lambda_handler = async (event, context) => {
  logger.addContext(context);
  logger.info(event)
  const {recordingId, topicPrefix} = event

  await validateInput(recordingId, topicPrefix)

  const recordingMetadata = await getRecordingMetadata(recordingId)
  const recordingName = recordingMetadata.recordingName
  const replayId = Date.now()
  const taskFamily = `${TOOLBOX_ECS_TASK_PREFIX}-${recordingId}-${replayId}`

  const containerArgs = [recordingId, replayId.toString()]
  if (topicPrefix) containerArgs.push(topicPrefix)

  // Since MQTT allows almost all characters for topic names we can't really sanitize the user-provided topicPrefix
  // before passing at as argument to the container. So instead we b64 encode the entire thing to prevent command injection
  const b64ContainerArgs = Buffer.from(containerArgs.join(' ')).toString('base64')

  const taskId = await startEcsTask(b64ContainerArgs, taskFamily)

  logger.info({recordingId, recordingName, replayId, taskId, topicPrefix})
  await updateReplayTable({recordingId, recordingName, replayId, taskId, topicPrefix})

  return {
    recordingId,
    replayId
  }
}
