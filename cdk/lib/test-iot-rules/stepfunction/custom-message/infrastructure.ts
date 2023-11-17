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
import { ToolboxLambdaFunction } from '../../../common/toolbox-lambda-function'
import { TOOLBOX_IOT_RULE_PREFIX } from '../../../constants'
import path = require('path');

export interface CustomMessageProps {
  createIngestRuleLambda: lambda.Function;
  ingestMessageLambda: lambda.Function
  deleteRuleLambda: lambda.Function
}

export class CustomMessage extends Construct {
  stepfunction: cdk.aws_stepfunctions.StateMachine

  constructor (scope: Construct, id: string, props: CustomMessageProps) {
    super(scope, id)

    const defineRuleNameLambda = ToolboxLambdaFunction.Python(
      this,
      'defineRuleNameLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/define_rule_name')
        ),
        serviceName: 'IotToolbox-DefineCustomMessageRuleName',
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

    const createRuleTask = new sfntasks.LambdaInvoke(this, 'CreateRuleTask', {
      lambdaFunction: props.createIngestRuleLambda,
      payloadResponseOnly: true,
      resultPath: '$.input'
    })

    const ingestMessageTask = new sfntasks.LambdaInvoke(
      this,
      'IngestMessageTask',
      {
        lambdaFunction: props.ingestMessageLambda,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          taskToken: sfn.JsonPath.taskToken,
          'input.$': '$'
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

    createRuleTask.addCatch(deleteRuleTask, {
      errors: ['SqlParseException'],
      resultPath: '$.error'
    })

    const definition = defineRuleNameTask
      .next(createRuleTask)
      .next(ingestMessageTask.next(deleteRuleTask))

    this.stepfunction = new sfn.StateMachine(this, 'StateMachine', {
      definitionBody: DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.seconds(25),
      tracingEnabled: true
    })
  }
}
