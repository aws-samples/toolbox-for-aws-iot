/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { IotToolbox } from '../lib/deployment'
import { configureCdkNag } from '../lib/cdk-nag-config'
import { Tags } from 'aws-cdk-lib'
import { TOOLBOX_NAME } from '../lib/constants'
import { CloudfrontWafStack } from '../lib/common/waf'

const app = new cdk.App()
function getBoolean (value: unknown) {
  switch (value) {
    case true:
    case 'true':
    case 1:
    case '1':
    case 'on':
    case 'yes':
      return true
    default:
      return false
  }
}

const deployFrontend = getBoolean(process.env.TOOLBOX_DEPLOY_FRONTEND || app.node.tryGetContext('deployFrontend'))
const enableWAF = getBoolean(process.env.TOOLBOX_ENABLE_WAF || app.node.tryGetContext('enableWAF'))
const enableCloudFrontWAF = getBoolean(process.env.TOOLBOX_ENABLE_CLOUDFRONT_WAF || app.node.tryGetContext('enableCloudFrontWAF'))
const enableApiLogging = getBoolean(process.env.TOOLBOX_ENABLE_API_LOGGING || app.node.tryGetContext('enableApiLogging'))
const enableS3Logging = getBoolean(process.env.TOOLBOX_ENABLE_S3_LOGGING || app.node.tryGetContext('enableS3Logging'))
const enableCloudFrontLogging = getBoolean(process.env.TOOLBOX_ENABLE_CLOUDFRONT_LOGGING || app.node.tryGetContext('enableCloudFrontLogging'))
const enableVpcLogging = getBoolean(process.env.TOOLBOX_ENABLE_VPC_LOGGING || app.node.tryGetContext('enableVpcLogging'))
const region = ((process.env.TOOLBOX_REGION || app.node.tryGetContext('region')) as string) || undefined
const ruleRoleArnsString = ((process.env.TOOLBOX_RULE_ROLE_ARNS || app.node.tryGetContext('ruleRoleArns')) as string) || undefined
const ruleRoleArns = ruleRoleArnsString ? ruleRoleArnsString.split(',') : []

if (enableCloudFrontWAF && !region) {
  console.error('When enabling WAF for CloudFront, you explicitly need to specify the deployment region for the Toolbox for AWS IoT. Please set the "TOOLBOX_REGION" environment variable or pass the region as CDK context variable "-c region=<region>"')
  process.exit(1)
}

const initialUserEmail: string|undefined = (process.env.TOOLBOX_INITIAL_USER_EMAIL || app.node.tryGetContext('initialUserEmail')) as string || undefined
if (initialUserEmail && !initialUserEmail.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
  console.error(`Provided email address ${initialUserEmail} is not valid. Please provide a valid email address}`)
  process.exit(1)
}

let cloudfrontWafStack
if (enableCloudFrontWAF) {
  cloudfrontWafStack = new CloudfrontWafStack(app, 'IotToolboxCloudfrontWAF', {
    env: {
      region: 'us-east-1'
    },
    crossRegionReferences: true
  })
}

// eslint-disable-next-line no-new
const toolboxStack = new IotToolbox(app, 'IotToolbox', {
  deployFrontend,
  enableApiLogging,
  enableCloudFrontLogging,
  enableS3Logging,
  enableVpcLogging,
  enableWAF,
  ruleRoleArns,
  initialUserEmail,
  cloudfrontWafStack,
  crossRegionReferences: true,
  env: {
    region
  },
  description: 'This template deploys the Toolbox for AWS IoT (uksb-1tupboc61)'
})

configureCdkNag(app, toolboxStack, deployFrontend)

Tags.of(app).add(`${TOOLBOX_NAME}:managed`, 'true')
