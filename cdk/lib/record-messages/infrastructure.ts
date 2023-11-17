/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { RemovalPolicy } from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { TOOLBOX_IOT_RULE_PREFIX } from '../constants'
import path = require('path');
import { TableEncryption } from 'aws-cdk-lib/aws-dynamodb'
import { ToolboxLambdaFunction } from '../common/toolbox-lambda-function'

export class RecordMessagesConstruct extends Construct {
  startRecordingFunction: cdk.aws_lambda.Function
  stopRecordingFunction: cdk.aws_lambda.Function
  listRecordingsFunction: cdk.aws_lambda.Function
  recordingTable: cdk.aws_dynamodb.Table
  metaDataTable: cdk.aws_dynamodb.Table

  constructor (scope: Construct, id: string) {
    super(scope, id)

    this.recordingTable = new dynamodb.Table(this, 'RecordingTable', {
      partitionKey: {
        name: 'recordingId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED
    })

    this.metaDataTable = new dynamodb.Table(this, 'MetaDataTable', {
      partitionKey: {
        name: 'recordingId',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED
    })

    const startRecordingRole = new iam.Role(this, 'StartRecordingRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const stopRecordingRole = new iam.Role(this, 'StopRecordingRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const iotRuleRole = new iam.Role(this, 'CreateRuleRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com')
    })

    const listRecordingsRole = new iam.Role(this, 'GetRecordMessagesRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    this.startRecordingFunction = ToolboxLambdaFunction.NodeJS(
      this,
      'StartRecordingMessagesLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/start-recording')
        ),
        role: startRecordingRole,
        environment: {
          RECORDING_TABLE: this.recordingTable.tableName,
          METADATA_TABLE: this.metaDataTable.tableName,
          TOOLBOX_IOT_RULE_PREFIX,
          IOT_RULE_ARN: iotRuleRole.roleArn
        },
        timeout: cdk.Duration.seconds(30)
      }
    )

    this.stopRecordingFunction = ToolboxLambdaFunction.NodeJS(
      this,
      'StopRecordingMessagesLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/stop-recording')
        ),
        role: stopRecordingRole,
        environment: {
          METADATA_TABLE: this.metaDataTable.tableName,
          TOOLBOX_IOT_RULE_PREFIX
        },
        timeout: cdk.Duration.seconds(30)
      }
    )

    this.listRecordingsFunction = ToolboxLambdaFunction.NodeJS(
      this,
      'ListRecordingsFunction',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/list-recordings')
        ),
        role: listRecordingsRole,
        environment: {
          METADATA_TABLE: this.metaDataTable.tableName
        },
        timeout: cdk.Duration.seconds(30)
      }
    )

    startRecordingRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    // lambda policy scoped to iot rules with prefix TOOLBOX_IOT_RULE_PREFIX
    startRecordingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:CreateTopicRule'],
        resources: [
          `arn:aws:iot:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:rule/${TOOLBOX_IOT_RULE_PREFIX}_*`
        ],
        effect: iam.Effect.ALLOW
      })
    )

    // lambda policy scoped to dynamodb tables with prefix $TOOLBOX_TABLE_PREFIX
    startRecordingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem'],
        resources: [this.metaDataTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    // lambda policy scoped to roles and policies tables with prefix $TOOLBOX_TABLE_PREFIX
    startRecordingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [iotRuleRole.roleArn],
        effect: iam.Effect.ALLOW
      })
    )

    stopRecordingRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    // lambda policy scoped to dynamodb Meta table
    stopRecordingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:UpdateItem'],
        resources: [this.metaDataTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    stopRecordingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:DeleteTopicRule'],
        resources: [
          `arn:aws:iot:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:rule/${TOOLBOX_IOT_RULE_PREFIX}_*`
        ],
        effect: iam.Effect.ALLOW
      })
    )

    // lambda policy scoped to RECORDING_TABLE
    listRecordingsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Scan'],
        resources: [this.metaDataTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    iotRuleRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem'],
        resources: [this.recordingTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )
  }
}
