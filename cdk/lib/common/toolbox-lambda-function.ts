/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as lambda from 'aws-cdk-lib/aws-lambda'
import { RuntimeFamily } from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import { FunctionOptions, FunctionProps } from 'aws-cdk-lib/aws-lambda/lib/function'
import { Construct } from 'constructs'
import { Code } from 'aws-cdk-lib/aws-lambda/lib/code'
import { Stack } from 'aws-cdk-lib'

const POWERTOOL_LAYER_VERSIONS: { [key: number]: string; } = {
  [RuntimeFamily.PYTHON]: '017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:40',
  [RuntimeFamily.NODEJS]: '094274105915:layer:AWSLambdaPowertoolsTypeScript:18'
}

const powertoolsLayers: { [key: number]: lambda.ILayerVersion; } = {}

interface RequiredLambdaFunctionProps extends FunctionOptions {
  readonly runtime: lambda.Runtime
  readonly code: Code
}

export interface OptionalLambdaProps extends FunctionOptions {
  readonly handler?: string;
  readonly serviceName?: string
  readonly layers?: lambda.ILayerVersion[]
}

export interface LambdaFunctionProps extends OptionalLambdaProps {
  readonly code: Code
}

export interface BaseLambdaFunctionProps extends RequiredLambdaFunctionProps, OptionalLambdaProps {
}

export class ToolboxLambdaFunction extends lambda.Function {
  private constructor (scope: Construct, id: string, props: BaseLambdaFunctionProps) {
    const environment = props.environment || {}
    if (props.serviceName) {
      environment.POWERTOOLS_SERVICE_NAME = props.serviceName
    }

    const defaultFunctionProps = {
      handler: 'index.lambda_handler',
      runtime: props.runtime,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.FIVE_DAYS,
      environment
    }

    const functionProps: FunctionProps = {
      ...defaultFunctionProps,
      ...props
    }

    super(scope, id, functionProps)
  }

  static Python (scope: Construct, id: string, props: LambdaFunctionProps) {
    return this.withProperties(scope, id, { ...props, runtime: lambda.Runtime.PYTHON_3_11 })
  }

  static NodeJS (scope: Construct, id: string, props: LambdaFunctionProps) {
    return this.withProperties(scope, id, { ...props, runtime: lambda.Runtime.NODEJS_LATEST })
  }

  private static withProperties (scope: Construct, id: string, props: BaseLambdaFunctionProps) {
    const layers = props.layers || []

    if (props.runtime.family !== undefined) {
      if (props.runtime.family in POWERTOOL_LAYER_VERSIONS) {
        if (!(props.runtime.family in powertoolsLayers)) {
          powertoolsLayers[props.runtime.family] = lambda.LayerVersion.fromLayerVersionArn(Stack.of(scope), `PowertoolsLayer${props.runtime.family}`, `arn:aws:lambda:${Stack.of(scope).region}:${POWERTOOL_LAYER_VERSIONS[props.runtime.family]}`)
        }
        layers.push(powertoolsLayers[props.runtime.family])
      }
    }

    return new this(scope, id, { ...props, layers })
  }
}
