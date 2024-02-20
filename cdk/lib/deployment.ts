/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { TestIotRulesConstruct } from './test-iot-rules/infrastructure'
import { ApiConstruct } from './api/infrastructure'
import { FrontendConstruct } from './frontend/infrastructure'
import { ToolboxAuth } from './auth/infrastructure'
import { RecordMessagesConstruct } from './record-messages/infrastructure'
import { ReplayMessagesConstruct } from './replay-messages/infrastructure'
import { DeleteRecordingsConstruct } from './delete-recordings/infrastructure'
import { CloudfrontWafStack, WafConstruct } from './common/waf'
import { S3AccessLoggingConstruct } from './common/s3-access-logging'

export interface IotToolboxProps extends cdk.StackProps {
  deployFrontend: boolean;
  enableWAF: boolean;
  enableApiLogging: boolean;
  enableS3Logging: boolean;
  enableCloudFrontLogging: boolean;
  enableVpcLogging: boolean;
  ruleRoleArns: string[]
  initialUserEmail?: string;
  cloudfrontWafStack?: CloudfrontWafStack;
}

export class IotToolbox extends cdk.Stack {
  public readonly apiConstructRestApiId: string
  public readonly apiConstructRestApiLambdaArn: string
  public readonly testIotRulesConstruct: TestIotRulesConstruct
  public readonly recordMessagesConstruct: RecordMessagesConstruct
  public readonly replayMessagesConstruct: ReplayMessagesConstruct
  public readonly deleteRecordingsConstruct: DeleteRecordingsConstruct
  public readonly frontendConstruct?: FrontendConstruct
  public readonly deployFrontend: boolean
  public readonly s3AccessLoggingConstruct?: S3AccessLoggingConstruct

  constructor (scope: Construct, id: string, props?: IotToolboxProps) {
    super(scope, id, props)

    const waf = props?.enableWAF ? new WafConstruct(this, 'WAF', { scope: 'REGIONAL' }) : undefined
    this.s3AccessLoggingConstruct = props?.enableS3Logging ? new S3AccessLoggingConstruct(this, 'S3Logs') : undefined

    this.testIotRulesConstruct = new TestIotRulesConstruct(this, 'TestIotRules', { ruleRoleArns: props?.ruleRoleArns || [] })
    this.recordMessagesConstruct = new RecordMessagesConstruct(this, 'RecordMessages')
    this.replayMessagesConstruct = new ReplayMessagesConstruct(this, 'ReplayMessages', {
      metaDataTable: this.recordMessagesConstruct.metaDataTable,
      recordingTable: this.recordMessagesConstruct.recordingTable,
      enableVpcLogging: props?.enableVpcLogging || true
    })

    this.deleteRecordingsConstruct = new DeleteRecordingsConstruct(this, 'DeleteRecordings', {
      metaDataTable: this.recordMessagesConstruct.metaDataTable,
      recordingTable: this.recordMessagesConstruct.recordingTable,
      replayTable: this.replayMessagesConstruct.replayHistoryTable

    })

    const apiConstruct = new ApiConstruct(this, 'API', {
      stepfunctionCustomMessage: this.testIotRulesConstruct.stepfunctionCustomMessage,
      stepfunctionTopicMessage: this.testIotRulesConstruct.stepfunctionTopicMessage,
      startRecordingFunction: this.recordMessagesConstruct.startRecordingFunction,
      stopRecordingFunction: this.recordMessagesConstruct.stopRecordingFunction,
      listRecordingsFunction: this.recordMessagesConstruct.listRecordingsFunction,
      startReplayingFunction: this.replayMessagesConstruct.startReplayingFunction,
      stopReplayingFunction: this.replayMessagesConstruct.stopReplayingFunction,
      listReplaysFunction: this.replayMessagesConstruct.listReplayingFunction,
      deleteRecordingsMachine: this.deleteRecordingsConstruct.stateMachine,
      enableApiLogging: props?.enableApiLogging || true,
      waf
    })
    this.apiConstructRestApiId = apiConstruct.apiId
    this.apiConstructRestApiLambdaArn = apiConstruct.invokationLambdaArn

    if (props?.deployFrontend) {
      const toolboxAuth = new ToolboxAuth(this, 'Auth', {
        initialUserEmail: props.initialUserEmail,
        waf
      })
      apiConstruct.grantExecute(toolboxAuth.identityPool.authenticatedRole)

      this.frontendConstruct = new FrontendConstruct(this, 'Frontend', {
        toolboxAuth,
        cloudFrontWaf: props.cloudfrontWafStack,
        s3Logs: this.s3AccessLoggingConstruct,
        enableCloudfrontLogging: props?.enableCloudFrontLogging || true,
        apiURL: apiConstruct.apiURL
      })
    }
  }
}
