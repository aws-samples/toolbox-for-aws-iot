/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import { DefinitionBody } from 'aws-cdk-lib/aws-stepfunctions'
import * as sfntasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as iam from 'aws-cdk-lib/aws-iam'
import { ToolboxLambdaFunction } from '../../../common/toolbox-lambda-function'
import { TOOLBOX_ERROR_TOPIC, TOOLBOX_IOT_RULE_PREFIX } from '../../../constants'
import path = require('path');

export interface TopicMessageProps {
  receiveMessageLambda: lambda.Function;
  createIngestRuleLambda: lambda.Function;
  ingestMessageLambda: lambda.Function
  deleteRuleLambda: lambda.Function
  publishMessageLambdaRole: iam.Role
  createRuleLambdaRole: iam.Role

}

export class TopicMessage extends Construct {
  stepfunction: cdk.aws_stepfunctions.StateMachine

  constructor (scope: Construct, id: string, props: TopicMessageProps) {
    super(scope, id)

    const createGetMessageRuleLambda = ToolboxLambdaFunction.Python(
      this,
      'createGetMessageRuleLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/create_get_message_rule')
        ),
        environment: {
          RECEIVE_MESSAGE_LAMBDA_ARN: props.receiveMessageLambda.functionArn,
          PUBLISH_MESSAGE_ROLE_ARN: props.publishMessageLambdaRole.roleArn,
          REPUBLISH_ERROR_TOPIC: TOOLBOX_ERROR_TOPIC
        },
        role: props.createRuleLambdaRole,
        serviceName: 'IotToolbox-CreateGetMessageRule'
      }
    )

    const defineRuleNameLambda = ToolboxLambdaFunction.Python(
      this,
      'defineRuleNameLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/define_topicmsg_rule_name')
        ),
        serviceName: 'IotToolbox-DefineTopicMessageRuleName',
        environment: {
          TOOLBOX_IOT_RULE_PREFIX
        }
      }
    )

    const defineRuleNameTask = new sfntasks.LambdaInvoke(
      this,
      'DefineRuleNameTask',
      {
        lambdaFunction: defineRuleNameLambda,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          'execution.$': '$$.Execution.Name',
          'input.$': '$'
        }),
        outputPath: '$'
      }
    )

    const createGetMessageRuleTask = new sfntasks.LambdaInvoke(
      this,
      'CreateGetMessageRuleTask',
      {
        lambdaFunction: createGetMessageRuleLambda,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          taskToken: sfn.JsonPath.taskToken,
          'input.$': '$'
        }),
        heartbeatTimeout: sfn.Timeout.duration(cdk.Duration.seconds(25)),
        resultPath: '$.createMessageRuleOutput'
      }
    )

    const createIngestRuleTask = new sfntasks.LambdaInvoke(
      this,
      'CreateIngestRuleTask',
      {
        lambdaFunction: props.createIngestRuleLambda,
        payloadResponseOnly: true,
        resultPath: '$.createIngestRuleOutput',
        payload: sfn.TaskInput.fromObject({
          // taskToken: sfn.JsonPath.taskToken,
          'input.$': '$'
        })
      }
    )

    const ingestMessageTask = new sfntasks.LambdaInvoke(
      this,
      'IngestMessageTask',
      {
        lambdaFunction: props.ingestMessageLambda,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          taskToken: sfn.JsonPath.taskToken,
          'input.$': '$.createMessageRuleOutput',
          'ingestRuleName.$': '$.ingestRuleName'
        }),
        heartbeatTimeout: sfn.Timeout.duration(cdk.Duration.seconds(2)),
        resultPath: '$.result'
      }
    )

    const deleteRuleTask = new sfntasks.LambdaInvoke(this, 'DeleteRuleTask', {
      lambdaFunction: props.deleteRuleLambda,
      payloadResponseOnly: true,
      outputPath: '$'
    })

    ingestMessageTask.addCatch(deleteRuleTask, {
      errors: ['States.HeartbeatTimeout'],
      resultPath: '$.error'
    })

    createIngestRuleTask.addCatch(deleteRuleTask, {
      errors: ['SqlParseException'],
      resultPath: '$.error'
    })

    const definition = defineRuleNameTask
      .next(createGetMessageRuleTask.addCatch(deleteRuleTask, {
        resultPath: '$.error'
      }))
      .next(createIngestRuleTask)
      .next(ingestMessageTask.next(deleteRuleTask))

    this.stepfunction = new sfn.StateMachine(this, 'StateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.seconds(60),
      tracingEnabled: true
    })
  }
}
