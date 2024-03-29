/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { TopicMessage } from './stepfunction/topic-message/infrastructure'
import { CustomMessage } from './stepfunction/custom-message/infrastructure'
import { SharedRuleProcessingConstructs, SharedRuleProcessingConstructsProps } from './stepfunction/shared/infrastructure'

interface TestIotRulesConstructProps extends SharedRuleProcessingConstructsProps {}

export class TestIotRulesConstruct extends Construct {
  stepfunctionTopicMessage: cdk.aws_stepfunctions.StateMachine
  stepfunctionCustomMessage: cdk.aws_stepfunctions.StateMachine

  constructor (scope: Construct, id: string, props: TestIotRulesConstructProps) {
    super(scope, id)

    const sharedConstructs = new SharedRuleProcessingConstructs(this, 'SharedConstructs', { ...props })

    this.stepfunctionTopicMessage = new TopicMessage(this, 'TopicMessage', { ...sharedConstructs }).stepfunction
    this.stepfunctionCustomMessage = new CustomMessage(this, 'CustomMessage', { ...sharedConstructs }).stepfunction
  }
}
