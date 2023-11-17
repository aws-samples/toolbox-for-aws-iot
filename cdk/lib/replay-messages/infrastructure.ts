/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import {RemovalPolicy} from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import {Construct} from 'constructs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import {RetentionDays} from 'aws-cdk-lib/aws-logs'

import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import {DockerImageAsset} from 'aws-cdk-lib/aws-ecr-assets'
import {TOOLBOX_ECS_TASK_PREFIX} from '../constants'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import {TableEncryption} from 'aws-cdk-lib/aws-dynamodb'
import {ToolboxLambdaFunction} from '../common/toolbox-lambda-function'
import path = require('path');

export interface ReplayMessagesConstructProps {
  enableVpcLogging: boolean;
  recordingTable: cdk.aws_dynamodb.Table;
  metaDataTable: cdk.aws_dynamodb.Table
}

export class ReplayMessagesConstruct extends Construct {
  startReplayingFunction: cdk.aws_lambda.Function
  stopReplayingFunction: cdk.aws_lambda.Function
  listReplayingFunction: cdk.aws_lambda.Function
  replayHistoryTable: cdk.aws_dynamodb.Table

  constructor (
    scope: Construct,
    id: string,
    props: ReplayMessagesConstructProps
  ) {
    super(scope, id)

    this.replayHistoryTable = new dynamodb.Table(this, 'ReplayHistoryTable', {
      partitionKey: {
        name: 'recordingId',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: { name: 'replayId', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: TableEncryption.AWS_MANAGED
    })

    const vpc = new ec2.Vpc(this, 'replay-messages-vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.144.0/26'),
      vpcName: 'replay-messages-vpc',
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 27,
          name: 'replay-ingress',
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 27,
          name: 'replay-application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      ]
    })

    if (props.enableVpcLogging) {
      const logGroup = new logs.LogGroup(this, 'VpcFlowLogs', {
        retention: RetentionDays.THREE_MONTHS
      })

      const role = new iam.Role(this, 'FlowLogRole', {
        assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com')
      })

      // eslint-disable-next-line no-new
      new ec2.FlowLog(this, 'FlowLog', {
        resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
        trafficType: ec2.FlowLogTrafficType.ALL,
        destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, role)
      })
    }

    const replayMessagesSG = new ec2.SecurityGroup(this, 'replay-messages-sg', {
      vpc,
      allowAllOutbound: true,
      description: 'security group for replay messages',
      securityGroupName: 'replay-messages-sg'
    })

    const cluster = new ecs.Cluster(this, 'replay-messages-cluster', {
      vpc
    })

    const privateSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
    }).subnets

    const replayMessagesImage = new DockerImageAsset(
      this,
      'ReplayMessageImage',
      {
        // Put the directory where your Dockerfile is below
        directory: path.join(__dirname, 'container-image'),
        invalidation: {
          buildArgs: false
        }
      }
    )

    const startReplayMessageRole = new iam.Role(this, 'ReplayMessageRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const stopReplayMessageRole = new iam.Role(this, 'StopReplayMessageRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const listReplaysRole = new iam.Role(this, 'ListReplaysRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    })

    const ecsExecRole = new iam.Role(this, 'EcsExecRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
    })

    const ecsTaskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
    })

    this.startReplayingFunction = ToolboxLambdaFunction.NodeJS(
      this,
      'StartReplayingMessagesLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/start-replaying')
        ),
        role: startReplayMessageRole,
        environment: {
          RECORDING_TABLE: props.recordingTable.tableName,
          REPLAY_TABLE: this.replayHistoryTable.tableName,
          METADATA_TABLE: props.metaDataTable.tableName,
          IMAGE_NAME: replayMessagesImage.imageUri,
          ECS_TASK_ROLE: ecsTaskRole.roleArn,
          ECS_EXEC_ROLE: ecsExecRole.roleArn,
          CLUSTER_NAME: cluster.clusterName,
          PRIVATE_SUBNET: privateSubnets.map((s) => s.subnetId).join(','),
          SECURITY_GROUP: replayMessagesSG.securityGroupId,
          TOOLBOX_ECS_TASK_PREFIX
        },
        timeout: cdk.Duration.seconds(30)
      }
    )

    this.stopReplayingFunction = ToolboxLambdaFunction.NodeJS(
      this,
      'StopReplayingMessagesLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/stop-replaying')
        ),
        role: stopReplayMessageRole,
        environment: {
          CLUSTER_NAME: cluster.clusterName,
          REPLAY_TABLE: this.replayHistoryTable.tableName
        },
        timeout: cdk.Duration.seconds(30)
      }
    )

    this.listReplayingFunction = ToolboxLambdaFunction.NodeJS(
      this,
      'ListReplaysLambda',
      {
        code: lambda.Code.fromAsset(
          path.join(__dirname, 'lambda/list-replays')
        ),
        role: listReplaysRole,
        environment: {
          REPLAY_TABLE: this.replayHistoryTable.tableName
        },
        timeout: cdk.Duration.seconds(30)
      }
    )

    startReplayMessageRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    startReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [ecsTaskRole.roleArn, ecsExecRole.roleArn],
        effect: iam.Effect.ALLOW
      })
    )

    startReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RegisterTaskDefinition'],
        resources: ['*'],
        effect: iam.Effect.ALLOW
      })
    )

    startReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [
          `arn:aws:ecs:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:task-definition/${TOOLBOX_ECS_TASK_PREFIX}*`,
          `arn:aws:ecs:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:task-definition/${TOOLBOX_ECS_TASK_PREFIX}*:*`
        ],
        conditions: {
          StringEquals: {
            'ecs:Cluster': cluster.clusterArn
          }
        },
        effect: iam.Effect.ALLOW
      })
    )

    startReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem'],
        resources: [props.metaDataTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    startReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem'],
        resources: [this.replayHistoryTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    stopReplayMessageRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    // lambda policy scoped to recording dynamodb tables
    stopReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
        resources: [this.replayHistoryTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    stopReplayMessageRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:StopTask'],
        resources: [
          `arn:aws:ecs:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:task/${cluster.clusterName}/*`
        ],
        conditions: {
          StringEquals: {
            'ecs:Cluster': cluster.clusterArn
          }
        },
        effect: iam.Effect.ALLOW
      })
    )

    listReplaysRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    )

    listReplaysRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Scan'],
        resources: [this.replayHistoryTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    // ECS Task Execution Role permissions
    ecsExecRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage'
        ],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:log-group:firelens-container:*`,
          replayMessagesImage.repository.repositoryArn
        ],
        effect: iam.Effect.ALLOW
      })
    )

    ecsExecRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
        effect: iam.Effect.ALLOW
      })
    )

    // ECS Task Role permissions
    ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:UpdateItem'],
        resources: [this.replayHistoryTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [props.recordingTable.tableArn],
        effect: iam.Effect.ALLOW
      })
    )

    ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:Publish'],
        resources: [
          `arn:aws:iot:${cdk.Stack.of(this).region}:${
            cdk.Stack.of(this).account
          }:topic/*`
        ],
        effect: iam.Effect.ALLOW
      })
    )
  }
}
