/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/// !cdk-integ IntegrationTestStack
// eslint-disable-next-line cdk/filename-match-regex
import 'source-map-support/register'
import { IntegTest } from '@aws-cdk/integ-tests-alpha'
import { App } from 'aws-cdk-lib'
import { IotToolbox } from '../lib/deployment'
import { IntegTestIotRuleConstruct, PublishMessageLambdaStack } from './test-iot-rule/infrastructure'
import { configureCdkNag } from '../lib/cdk-nag-config'
import { NagSuppressions } from 'cdk-nag'

const app = new App()

const iotToolboxIntegStack = new IotToolbox(app, 'iotToolboxIntegStack', {
  deployFrontend: false
})

configureCdkNag(app, iotToolboxIntegStack, false)

const topicMessage = 'integtest/msg'

const publishMessageLambdaStack = new PublishMessageLambdaStack(
  app,
  'PublishMessageLambdaStack',
  {
    topic: topicMessage
  }
)

NagSuppressions.addStackSuppressions(publishMessageLambdaStack, [
  { id: 'AwsSolutions-IAM4', reason: 'AWSLambdaBasicExecutionRole is assigned by default', appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'] }
])

const iotToolboxIntegTest = new IntegTest(app, 'IotToolboxIntegTest', {
  testCases: [publishMessageLambdaStack, iotToolboxIntegStack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true
      }
    }
  },
  regions: [iotToolboxIntegStack.region]
})

new IntegTestIotRuleConstruct(app, 'IntegTestIotRuleConstruct', {
  iotToolboxIntegStack,
  iotToolboxIntegTest
})
