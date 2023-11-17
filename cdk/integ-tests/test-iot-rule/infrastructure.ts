/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { ExpectedResult, IntegTest, InvocationType } from '@aws-cdk/integ-tests-alpha'
import { IotToolbox } from '../../lib/deployment'
import lambdaTests from './data/integ-tests-lambda.json'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources'
import path = require('path');

export interface PublishMessageLambdaStackProps {
  topic: string;
}

export class PublishMessageLambdaStack extends cdk.Stack {
  constructor (
    scope: Construct,
    id: string,
    props: PublishMessageLambdaStackProps
  ) {
    super(scope, id)

    const publishMessageRole = new iam.Role(this, 'PublishMessageRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    publishMessageRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [
          'arn:aws:iot:' + this.region + ':' + this.account + ':topic/' + props.topic
        ],
        actions: ['iot:Publish']
      })
    )

    publishMessageRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    const publishMessageLambda = new lambda.Function(
      this,
      'PublishMessageLambda',
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: 'index.lambda_handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda')
        ),
        role: publishMessageRole,
        timeout: cdk.Duration.minutes(10),
        environment: {
          TOPIC: props.topic
        }
      }
    )

    new AwsCustomResource(
      this,
      'PublishMessageLambdaTrigger',
      {
        policy: AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            effect: iam.Effect.ALLOW,
            resources: [publishMessageLambda.functionArn]
          })
        ]),
        timeout: cdk.Duration.minutes(10),
        onCreate: {
          service: 'Lambda',
          action: 'invoke',
          parameters: {
            FunctionName: publishMessageLambda.functionName,
            InvocationType: 'Event'
          },
          physicalResourceId: PhysicalResourceId.of(Date.now().toString())
        },
        onUpdate: {
          service: 'Lambda',
          action: 'invoke',
          parameters: {
            FunctionName: publishMessageLambda.functionName,
            InvocationType: 'Event'
          },
          physicalResourceId: PhysicalResourceId.of(Date.now().toString())
        }
      }
    )
  }
}

export interface IntegTestIotRuleConstructProps {
  iotToolboxIntegStack: IotToolbox;
  iotToolboxIntegTest: IntegTest;
}

interface TestCase {
  input: object
  result: object
}

export class IntegTestIotRuleConstruct extends Construct {
  constructor (scope: Construct, id: string, props: IntegTestIotRuleConstructProps) {
    super(scope, id)

    for (const test of (lambdaTests as TestCase[])) {
      const lambdaInvoke = props.iotToolboxIntegTest.assertions
        .awsApiCall('Lambda', 'InvokeCommand', {
          FunctionName: props.iotToolboxIntegStack.apiConstructRestApiLambdaArn,
          InvocationType: InvocationType.REQUEST_RESPONE,
          Payload: JSON.stringify(test.input)
        })
        .expect(
          ExpectedResult.objectLike({
            ExecutedVersion: '$LATEST',
            Payload: test.result,
            StatusCode: 200
          })
        )
      lambdaInvoke.provider.addToRolePolicy({
        Effect: 'Allow',
        Action: ['lambda:InvokeFunction'],
        Resource: [props.iotToolboxIntegStack.apiConstructRestApiLambdaArn]
      })
    }
  }
}
