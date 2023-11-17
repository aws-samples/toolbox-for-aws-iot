/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import { ToolboxLambdaFunction } from '../../../common/toolbox-lambda-function'
import { TOOLBOX_ERROR_TOPIC, TOOLBOX_IOT_RULE_PREFIX } from '../../../constants'
import path = require('path');

export class SharedRuleProcessingConstructs extends Construct {
  readonly receiveMessageLambda: lambda.Function
  readonly createIngestRuleLambda: lambda.Function
  readonly ingestMessageLambda: lambda.Function
  readonly deleteRuleLambda: lambda.Function
  readonly publishMessageLambdaRole: iam.Role
  readonly createRuleLambdaRole: iam.Role

  constructor (scope: Construct, id: string) {
    super(scope, id)
    const receiveMessageRole = new iam.Role(this, 'ReceiveMessageRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    receiveMessageRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )
    receiveMessageRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['states:SendTaskSuccess']
      })
    )

    this.receiveMessageLambda = ToolboxLambdaFunction.Python(
      this,
      'ReceiveMessageLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/receive_message')
        ),
        role: receiveMessageRole
      }
    )

    this.receiveMessageLambda.addPermission('IotRuleInvoke', {
      action: 'lambda:InvokeFunction',
      principal: new iam.ServicePrincipal('iot.amazonaws.com')
    })

    this.publishMessageLambdaRole = new iam.Role(
      this,
      'aws-iot-rule-forward-tmp-role',
      {
        assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
        inlinePolicies: {
          'allow-publish-to-tmp-topic': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ['iot:Publish'],
                resources: [
                  `arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${TOOLBOX_ERROR_TOPIC}`
                ]
              })
            ]
          })
        }
      }
    )

    this.createRuleLambdaRole = new iam.Role(this, 'CreateIoTRuleLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    this.createRuleLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )
    this.createRuleLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [`arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:rule/${TOOLBOX_IOT_RULE_PREFIX}*`],
        actions: ['iot:CreateTopicRule']
      })
    )
    this.createRuleLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [this.publishMessageLambdaRole.roleArn],
        actions: ['iam:PassRole']
      })
    )
    this.createRuleLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['states:SendTaskSuccess', 'states:SendTaskFailure']
      })
    )

    this.createIngestRuleLambda = ToolboxLambdaFunction.Python(
      this,
      'createIngestRuleLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/create_ingest_rule')
        ),
        environment: {
          RECEIVE_MESSAGE_LAMBDA_ARN: this.receiveMessageLambda.functionArn,
          PUBLISH_MESSAGE_ROLE_ARN: this.publishMessageLambdaRole.roleArn,
          REPUBLISH_ERROR_TOPIC: TOOLBOX_ERROR_TOPIC
        },
        role: this.createRuleLambdaRole,
        serviceName: 'IotToolbox-CreateIngestRule'
      }
    )

    const ingestMessageRuleLambdaRole = new iam.Role(
      this,
      'SendMessageRuleLambdaRole',
      {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
      }
    )

    ingestMessageRuleLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [`arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:topic/$aws/rules/${TOOLBOX_IOT_RULE_PREFIX}*`],
        actions: ['iot:Publish']
      })
    )
    ingestMessageRuleLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    this.ingestMessageLambda = ToolboxLambdaFunction.Python(
      this,
      'IngestMessageLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/ingest_message')
        ),
        role: ingestMessageRuleLambdaRole,
        serviceName: 'IotToolbox-IngestMessage'
      }
    )

    const deleteRuleRole = new iam.Role(this, 'DeleteRuleRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    this.deleteRuleLambda = ToolboxLambdaFunction.Python(this, 'DeleteRuleLambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/delete_rule')),
      role: deleteRuleRole,
      serviceName: 'IotToolbox-DeleteRule'
    })
    deleteRuleRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )
    deleteRuleRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [`arn:aws:iot:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:rule/${TOOLBOX_IOT_RULE_PREFIX}*`],
        actions: ['iot:DeleteTopicRule']
      })
    )
  }
}
