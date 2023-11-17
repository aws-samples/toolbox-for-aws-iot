/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import path = require('path');
import { Construct } from 'constructs'
import { ToolboxLambdaFunction } from '../common/toolbox-lambda-function'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'

interface DeleteRecordingsConstructProps {
  metaDataTable: cdk.aws_dynamodb.Table
  recordingTable: cdk.aws_dynamodb.Table;
  replayTable: cdk.aws_dynamodb.Table;
}

export class DeleteRecordingsConstruct extends Construct {
  readonly stateMachine: sfn.StateMachine
  constructor (scope: Construct, id: string, props: DeleteRecordingsConstructProps) {
    super(scope, id)

    const deleteRecordingsRole = new iam.Role(this, 'DeleteRecordingsRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const deleteRecordingsLambda = ToolboxLambdaFunction.NodeJS(
      this,
      'DeleteRecordingsLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda')
        ),
        role: deleteRecordingsRole,
        timeout: cdk.Duration.seconds(30)
      }
    )

    this.stateMachine = new sfn.StateMachine(this, 'Workflow', {
      definitionBody: sfn.DefinitionBody.fromFile(path.join(__dirname, 'statemachine.asl.json')), // workaround because we can't use "null" values in properties when defining the statemachine with CDK
      definitionSubstitutions: {
        metadataTableName: props.metaDataTable.tableName,
        recordingTableName: props.recordingTable.tableName,
        replayTableName: props.replayTable.tableName,
        deleteRecordingsLambdaArn: deleteRecordingsLambda.functionArn,
        batchSize: '25'
      }
    })

    this.stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [deleteRecordingsLambda.functionArn],
        effect: iam.Effect.ALLOW
      })
    )

    this.stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
        resources: [props.metaDataTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    this.stateMachine.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [props.recordingTable.tableArn, props.replayTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    deleteRecordingsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:BatchWriteItem'],
        resources: [props.recordingTable.tableArn, props.replayTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )
  }
}
