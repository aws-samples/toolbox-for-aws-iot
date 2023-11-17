/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib'
import { RemovalPolicy, Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { BucketAccessControl, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { execSync, ExecSyncOptionsWithBufferEncoding } from 'child_process'
import { copySync } from 'fs-extra'
import { ToolboxAuth } from '../auth/infrastructure'
import { FrontendConfig } from './frontend-config'
import { randomUUID } from 'crypto'
import { CloudfrontWafStack } from '../common/waf'
import { S3AccessLoggingConstruct } from '../common/s3-access-logging'
import path = require('path');

interface FrontendConstructProps {
    toolboxAuth: ToolboxAuth;
    apiURL: string;
    cloudFrontWaf?: CloudfrontWafStack
    s3Logs?: S3AccessLoggingConstruct
    enableCloudfrontLogging: boolean
}

export class FrontendConstruct extends Construct {
  readonly frontendBucket: s3.Bucket
  readonly frontendUrl: string

  constructor (scope: Construct, id: string, props: FrontendConstructProps) {
    super(scope, id)

    this.frontendBucket = new s3.Bucket(this, 'IoTToolboxFrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      serverAccessLogsBucket: props.s3Logs?.accessLogsBucket,
      serverAccessLogsPrefix: 'frontend',
      encryption: BucketEncryption.S3_MANAGED
    })

    const s3origin = new origins.S3Origin(this.frontendBucket)
    const cachingDisabledPolicy = cloudfront.CachePolicy.fromCachePolicyId(this, 'CachePolicy', '4135ea2d-6df8-44a3-9df3-4b5a84be39ad') // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html

    let loggingOptions = {}
    if (props.enableCloudfrontLogging) {
      const logBucket = new s3.Bucket(this, 'CFLogs', {
        enforceSSL: true,
        encryption: BucketEncryption.S3_MANAGED,
        serverAccessLogsBucket: props.s3Logs?.accessLogsBucket,
        serverAccessLogsPrefix: 'cloudfront',
        accessControl: BucketAccessControl.LOG_DELIVERY_WRITE
      })
      loggingOptions = {
        logBucket
      }
    }

    const distribution = new cloudfront.Distribution(this, 'IoTToolboxFrontendDistribution', {
      defaultBehavior: {
        origin: s3origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: 'index.html',
      additionalBehaviors: {
        '/index.html': {
          origin: s3origin,
          cachePolicy: cachingDisabledPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS

        },
        '/config.json': {
          origin: s3origin,
          cachePolicy: cachingDisabledPolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }
      },
      webAclId: props.cloudFrontWaf?.wafACL.attrArn,
      ...loggingOptions
    })

    this.frontendUrl = `https://${distribution.domainName}/`
    const execOptions: ExecSyncOptionsWithBufferEncoding = {
      stdio: 'inherit'
    }

    const bundle = s3deploy.Source.asset(path.join(__dirname, '..', '..', '..', 'frontend'), {
      bundling: {
        command: [
          'sh',
          '-c',
          'echo "Docker build not supported."'
        ],
        image: cdk.DockerImage.fromRegistry('alpine'),
        local: {
          tryBundle (outputDir: string) {
            try {
              execSync('npm --version; pwd', execOptions)
              execSync(
                'cd ../frontend/ && npm ci && npm run build', execOptions
              )
              copySync('../frontend/build', outputDir)
              return true
            } catch {
              return false
            }
          }
        }
      }
    })

    const clientId = props.toolboxAuth.addFrontend(this.frontendUrl)

    const frontendConfig: FrontendConfig = {
      random: randomUUID(),
      region: Stack.of(this).region,
      identityPoolId: props.toolboxAuth.identityPool.identityPoolId,
      userPoolId: props.toolboxAuth.userPool.userPoolId,
      userPoolDomain: props.toolboxAuth.userPoolDomain.domainName,
      userPoolWebClientId: clientId.userPoolClientId,
      apiEndpoint: props.apiURL
    }

    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      destinationBucket: this.frontendBucket,
      sources: [bundle, s3deploy.Source.jsonData('config.json', frontendConfig)],
      distribution
    })

    new cdk.CfnOutput(this, 'IotToolboxFrontendURL', {
      exportName: 'IotToolboxFrontendURL',
      value: this.frontendUrl
    })
  }
}
