/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Aspects } from 'aws-cdk-lib'
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'
import { TOOLBOX_ECS_TASK_PREFIX, TOOLBOX_IOT_RULE_PREFIX } from './constants'
import { IotToolbox } from './deployment'

export function configureCdkNag (app: cdk.App, toolboxStack: IotToolbox, deployFrontend: boolean) {
  Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))
  const region = app.node.tryGetContext('region') as string || '<AWS::Region>'

  NagSuppressions.addStackSuppressions(toolboxStack, [
    { id: 'AwsSolutions-IAM4', reason: 'Suppress disallowed use of managed policies for increased simplicity as this is a sample. Scope down in production!', appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole', 'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs'] },
    { id: 'AwsSolutions-IAM5', reason: 'states:SendTask* does not support Resource Types or Conditions', appliesTo: ['Action::states:SendTask*', 'Resource::*'] },
    { id: 'AwsSolutions-VPC7', reason: 'Suppress disallowed use of VPC without flow logs enabled for increased simplicity as this is a sample.' },
    { id: 'AwsSolutions-ECS4', reason: 'Suppress disallowed use of ECS without Container Insights for increased simplicity as this is a sample.' },
    { id: 'AwsSolutions-SF1', reason: 'Suppress disallowed use of StepFunctions without logging "ALL" events to Cloudwatch for simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-SF2', reason: 'Suppress disallowed use of StepFunctions without X-Ray for simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-APIG1', reason: 'Suppress disallowed use of API Gateway without access logging for increased simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-APIG3', reason: 'Suppress warning that WAF is not enabled for increased simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-APIG6', reason: 'Suppress disallowed use of API Gateway without logs at stage level for increased simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-APIG4', reason: 'The W3 spec for CORS preflight requests clearly states that user credentials should be excluded. For POST resources IAM authentication is used' },
    { id: 'AwsSolutions-COG2', reason: 'Suppress warning that MFA is not enabled on the Cognito User pool as there is no way to automatically provision the initial user with MFA' },
    { id: 'AwsSolutions-COG4', reason: 'Suppress disallowed use of API Gateway without Cognito User pool authorizer as IAM Authentication is configured instead of Cognito' },
    { id: 'AwsSolutions-CFR1', reason: 'Suppress warning about CloudFront geo restrictions. No geo  restrictions required' },
    { id: 'AwsSolutions-CFR2', reason: 'Suppress warning of WAF not being enabled for CloudFront for increased simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-CFR3', reason: 'Suppress disallowed use of CloudFront without access logging for increased simplicity and cost-effectiveness as this is a sample.' },
    { id: 'AwsSolutions-CFR4', reason: 'Suppress disallowed us of the default CloudFront viewer certificate since this is a sample and we can not create a certificate for an unknown domain name' },
    { id: 'AwsSolutions-DDB3', reason: 'Suppress warning of PITR not being enabled for DynamoDB. PITR is not required as this is a sample.' },
    { id: 'AwsSolutions-L1', reason : 'Suppress error caused by python_3_12'},
    {
      id: 'AwsSolutions-IAM5',
      reason: 'Suppress disallowed use of wildcards in IAM policies as all policies are scoped to resources with a specific prefix (e.g. "iottoolbox")',
      appliesTo: [
        `Resource::arn:aws:iot:${region}:<AWS::AccountId>:rule/${TOOLBOX_IOT_RULE_PREFIX}*`,
        `Resource::arn:aws:iot:${region}:<AWS::AccountId>:rule/${TOOLBOX_IOT_RULE_PREFIX}_*`,
        `Resource::arn:aws:iot:${region}:<AWS::AccountId>:topic/$aws/rules/${TOOLBOX_IOT_RULE_PREFIX}*`,
        `Resource::arn:aws:ecs:${region}:<AWS::AccountId>:task-definition/${TOOLBOX_ECS_TASK_PREFIX}*`,
        `Resource::arn:aws:ecs:${region}:<AWS::AccountId>:task-definition/${TOOLBOX_ECS_TASK_PREFIX}*:*`,
        { regex: `/^Resource::arn:aws:ecs:${region}:<AWS::AccountId>:task/<${toolboxStack.replayMessagesConstruct.node.id}.*>\/\*/g` }, // eslint-disable-line no-useless-escape
        'Resource::arn:aws:logs:<AWS::AccountId>:log-group:firelens-container:*',
        `Resource::arn:aws:iot:${region}:<AWS::AccountId>:topic/*`,
        `Resource::arn:aws:logs:${region}:<AWS::AccountId>:log-group:firelens-container:*`,
        // to address wildcard in Lambda function arns required for versions
        { regex: `/^Resource::<${toolboxStack.testIotRulesConstruct.node.id}.*.Arn>:*/g` },
        { regex: `/^Resource::arn:.*:states:${region}:<AWS::AccountId>:execution:.*${toolboxStack.testIotRulesConstruct.node.id}.*/g` }
      ]
    }
  ])
  if (toolboxStack.s3AccessLoggingConstruct) {
    NagSuppressions.addResourceSuppressionsByPath(toolboxStack, `/${toolboxStack.s3AccessLoggingConstruct?.node.path}/S3AccessLogs/Resource`, [
      {
        id: 'AwsSolutions-S1',
        reason: 'Suppress disallowed use of S3 buckets without access logging for increased simplicity and cost-effectiveness as this is a sample. The bucket is only used to host single page web app behind cloudfront'
      }
    ])
  }

  if (deployFrontend) {
    NagSuppressions.addResourceSuppressionsByPath(toolboxStack, `/${toolboxStack.node.id}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C`, [
      { id: 'AwsSolutions-L1', reason: 'Suppress disallowed use of a Lambda function using not the latest version of a runtime. This Lambda function is provided/managed by the CDK BucketDeployment Construct' },
      { id: 'AwsSolutions-IAM5', reason: 'Suppress disallowed use of wildcards in IAM policie as this Lambda function is provided/managed by the CDK BucketDeployment Construct' }
    ], true)
  }
}
