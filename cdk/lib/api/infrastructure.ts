/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as logs from 'aws-cdk-lib/aws-logs'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { ToolboxLambdaFunction } from '../common/toolbox-lambda-function'
import { customMessageRequestSchema, topicMessageRequestSchema } from './schemas'
import { WafConstruct } from '../common/waf'
import path = require('path');

export interface ApiConstructProps {
  stepfunctionTopicMessage: cdk.aws_stepfunctions.StateMachine;
  stepfunctionCustomMessage: cdk.aws_stepfunctions.StateMachine;
  startRecordingFunction: cdk.aws_lambda.Function;
  stopRecordingFunction: cdk.aws_lambda.Function;
  listRecordingsFunction: cdk.aws_lambda.Function;
  startReplayingFunction: cdk.aws_lambda.Function;
  stopReplayingFunction: cdk.aws_lambda.Function;
  listReplaysFunction: cdk.aws_lambda.Function;
  deleteRecordingsMachine: cdk.aws_stepfunctions.StateMachine;
  enableApiLogging: boolean,
  waf?: WafConstruct
}

export class ApiConstruct extends Construct {
  public readonly apiURL: string
  public readonly apiId: string
  public readonly invokationLambdaArn: string
  private api: apigateway.RestApi

  constructor (scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id)

    const invokeStepFunction = ToolboxLambdaFunction.Python(this, 'invokeStepFunction', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, 'lambda/invoke-stepfunction')
      ),
      environment: {
        SFN_CUSTOM_MESSAGE_ARN:
        props.stepfunctionCustomMessage.stateMachineArn,
        SFN_TOPIC_MESSAGE_ARN:
        props.stepfunctionTopicMessage.stateMachineArn
      },
      timeout: cdk.Duration.seconds(29)
    })

    props.stepfunctionCustomMessage.grantStartExecution(invokeStepFunction)
    props.stepfunctionCustomMessage.grantRead(invokeStepFunction)

    props.stepfunctionTopicMessage.grantStartExecution(invokeStepFunction)
    props.stepfunctionTopicMessage.grantRead(invokeStepFunction)

    const apiGWInvokeStepfunctionRole = new iam.Role(this, 'DeleteRecordingsRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    })

    props.deleteRecordingsMachine.grantStartExecution(apiGWInvokeStepfunctionRole)

    let logOptions = {}
    if (props.enableApiLogging) {
      const prdLogGroup = new logs.LogGroup(this, 'Logs', {
        retention: RetentionDays.THREE_MONTHS
      })
      logOptions = {
        accessLogDestination: new apigateway.LogGroupLogDestination(prdLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields()
      }
    }
    const restApi = new apigateway.RestApi(this, 'iot-toolbox-api', {
      deployOptions: {
        stageName: 'prod',
        ...logOptions
      },
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowMethods: ['GET', 'POST', 'OPTIONS']
      },
      cloudWatchRole: true
    })

    new apigateway.Deployment(this, 'Deployment', { api: restApi })

    new apigateway.RequestValidator(this, 'requestValidator', {
      restApi,
      validateRequestBody: true,
      validateRequestParameters: true
    })

    const customMessageModel = restApi.addModel('CustomMessageModel', customMessageRequestSchema)

    const topicMessageModel = restApi.addModel('TopicMessageModel', topicMessageRequestSchema)

    const startRecordModel = restApi.addModel('StartRecordModel', {
      contentType: 'application/json',
      modelName: 'StartRecordModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'startRecordRequest',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          recordingName: { type: apigateway.JsonSchemaType.STRING },
          topic: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['recordingName', 'topic']
      }
    })

    const stopRecordModel = restApi.addModel('StopRecordModel', {
      contentType: 'application/json',
      modelName: 'StopRecordModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'stopRecordRequest',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          recordingId: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['recordingId']
      }
    })

    const deleteRecordingModel = restApi.addModel('DeleteRecordModel', {
      contentType: 'application/json',
      modelName: 'DeleteRecordingModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'deleteRecordRequest',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          recordingId: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['recordingId']
      }
    })

    const startReplayModel = restApi.addModel('StartReplayModel', {
      contentType: 'application/json',
      modelName: 'StartReplayModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'startReplayRequest',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          recordingId: { type: apigateway.JsonSchemaType.STRING },
          topicPrefix: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['recordingId']
      }
    })

    const stopReplayModel = restApi.addModel('StopReplayModel', {
      contentType: 'application/json',
      modelName: 'StopReplayModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'stopReplayRequest',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          recordingId: { type: apigateway.JsonSchemaType.STRING },
          replayId: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['recordingId', 'replayId']
      }
    })

    const testRules = restApi.root.addResource('test-iot-rule')
    const customMessage = testRules.addResource('custom-message')
    const topicMessage = testRules.addResource('topic-message')

    const records = restApi.root.addResource('record')
    const startRecording = records.addResource('start')
    const stopRecording = records.addResource('stop')
    const deleteRecording = records.addResource('delete')

    const replays = restApi.root.addResource('replay')
    const startReplaying = replays.addResource('start')
    const stopReplaying = replays.addResource('stop')

    const integrationListRecordings = new apigateway.LambdaIntegration(
      props.listRecordingsFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationStartRecording = new apigateway.LambdaIntegration(
      props.startRecordingFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationStopRecording = new apigateway.LambdaIntegration(
      props.stopRecordingFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationDeleteRecording = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: apiGWInvokeStepfunctionRole,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({ status: 'Deletion scheduled' })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            statusCode: '500',
            responseTemplates: {
              'application/json': JSON.stringify({ status: 'Deletion failed' })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ],
        requestTemplates: {
          'application/json': `
            #set($input = $input.json('$'))
             {
               "input": "$util.escapeJavaScript($input).replaceAll("\\\\'", "'")",
               "stateMachineArn": "${props.deleteRecordingsMachine.stateMachineArn}"
             }`
        }
      }
    })

    const integrationListReplays = new apigateway.LambdaIntegration(
      props.listReplaysFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationStartReplaying = new apigateway.LambdaIntegration(
      props.startReplayingFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationStopReplaying = new apigateway.LambdaIntegration(
      props.stopReplayingFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationCustomMessage = new apigateway.LambdaIntegration(
      invokeStepFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    const integrationTopicMessage = new apigateway.LambdaIntegration(
      invokeStepFunction,
      {
        proxy: false,
        allowTestInvoke: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '$input.body'
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          },
          {
            selectionPattern: '(\n|.)+',
            statusCode: '400',
            responseTemplates: {
              'application/json': JSON.stringify({
                state: 'error',
                message:
                  "$util.escapeJavaScript($input.path('$.errorMessage'))"
              })
            },
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'true'"
            }
          }
        ]
      }
    )

    records.addMethod(
      'GET',
      integrationListRecordings,
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    startRecording.addMethod(
      'POST',
      integrationStartRecording,
      {
        requestModels: {
          'application/json': startRecordModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    stopRecording.addMethod(
      'POST',
      integrationStopRecording,
      {
        requestModels: {
          'application/json': stopRecordModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    deleteRecording.addMethod(
      'POST',
      integrationDeleteRecording,
      {
        requestModels: {
          'application/json': deleteRecordingModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    replays.addMethod(
      'GET',
      integrationListReplays,
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    startReplaying.addMethod(
      'POST',
      integrationStartReplaying,
      {
        requestModels: {
          'application/json': startReplayModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    stopReplaying.addMethod(
      'POST',
      integrationStopReplaying,
      {
        requestModels: {
          'application/json': stopReplayModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    customMessage.addMethod(
      'POST',
      integrationCustomMessage,
      {
        requestModels: {
          'application/json': customMessageModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    topicMessage.addMethod(
      'POST',
      integrationTopicMessage,
      {
        requestModels: {
          'application/json': topicMessageModel
        },

        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          },
          {
            statusCode: '400',
            responseParameters: {
              'method.response.header.Content-Type': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true
            }
          }
        ]
      }
    )

    if (props.waf) {
      props.waf.addAclAssociation('ApiGateway', restApi.deploymentStage.stageArn)
    }

    this.invokationLambdaArn = invokeStepFunction.functionArn
    this.apiId = restApi.restApiId
    this.api = restApi
    this.apiURL = restApi.url
  }

  public grantExecute (grantee: iam.IGrantable) {
    this.api.methods.forEach(m => m.grantExecute(grantee))
  }
}
