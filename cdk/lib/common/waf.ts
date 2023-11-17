/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import { aws_wafv2 as wafv2 } from 'aws-cdk-lib'
import { TOOLBOX_NAME } from '../constants'

export interface WafConstructProps {
  scope: 'REGIONAL' | 'CLOUDFRONT'
}

export class WafConstruct extends Construct {
  readonly wafACL: wafv2.CfnWebACL

  constructor (scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id)

    const namePrefix = props.scope === 'REGIONAL' ? `${TOOLBOX_NAME}` : `${TOOLBOX_NAME}-CF`

    this.wafACL = new wafv2.CfnWebACL(this, 'WAF', {
      name: `${namePrefix}-WAF`,
      defaultAction: {
        allow: {}
      },
      scope: props.scope,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${namePrefix}-WebACL`,
        sampledRequestsEnabled: true
      },
      rules: [{
        name: 'CRSRule',
        priority: 0,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS'
          }
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `${namePrefix}-WebACL-CRS`,
          sampledRequestsEnabled: true
        },
        overrideAction: {
          none: {}
        }
      },
      {
        name: 'IPReputationRule',
        priority: 1,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesAmazonIpReputationList',
            vendorName: 'AWS'
          }
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `${namePrefix}-WebACL-IRL`,
          sampledRequestsEnabled: true
        },
        overrideAction: {
          none: {}
        }
      }
      ]
    })
  }

  public addAclAssociation (id: string, resourceArn: string) {
    new wafv2.CfnWebACLAssociation(this, id, {
      resourceArn,
      webAclArn: this.wafACL.attrArn
    })
  }
}

export class CloudfrontWafStack extends cdk.Stack {
  readonly wafACL: wafv2.CfnWebACL

  constructor (scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)
    const wafConstruct = new WafConstruct(this, 'WAF', {
      scope: 'CLOUDFRONT'
    })

    this.wafACL = wafConstruct.wafACL
  }
}
