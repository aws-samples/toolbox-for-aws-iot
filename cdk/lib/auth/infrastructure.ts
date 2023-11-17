/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from 'constructs'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as cr from 'aws-cdk-lib/custom-resources'
import { IdentityPool, UserPoolAuthenticationProvider } from '@aws-cdk/aws-cognito-identitypool-alpha'
import { Stack } from 'aws-cdk-lib'
import { WafConstruct } from '../common/waf'

export interface ToolboxAuthProps {
    domainPrefix?: string;
    signInByEmail?: boolean; // default true
    signInCaseSensitive?: boolean; // default false
    initialUserEmail?: string,
    waf?: WafConstruct
}

export class ToolboxAuth extends Construct {
  readonly userPool: cognito.UserPool
  readonly identityPool: IdentityPool
  readonly userPoolDomain: cognito.UserPoolDomain

  constructor (scope: Construct, id: string, props: ToolboxAuthProps) {
    super(scope, id)

    this.userPool = new cognito.UserPool(this, 'IoTToolbox', {
      selfSignUpEnabled: false,
      signInCaseSensitive: props?.signInCaseSensitive || false,
      signInAliases: {
        username: false,
        email: props?.signInByEmail || true
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true
      },
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
    })

    this.userPoolDomain = this.userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix:
          props?.domainPrefix || `iottoolboxasd-${Stack.of(this).account}`
      }
    })

    this.identityPool = new IdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      authenticationProviders: {
        userPools: []
      }
    })

    if (props.waf) {
      props.waf.addAclAssociation('UserPool', this.userPool.userPoolArn)
    }

    // Create initial user
    if (props.initialUserEmail) {
      new cr.AwsCustomResource(this, 'CreateCognitoUser', {
        onCreate: {
          service: 'CognitoIdentityServiceProvider',
          action: 'AdminCreateUser',
          parameters: {
            UserPoolId: this.userPool.userPoolId,
            DesiredDeliveryMediums: ['EMAIL'],
            Username: props.initialUserEmail,
            UserAttributes: [
              {
                Name: 'email',
                Value: props.initialUserEmail
              }
            ]
          },
          physicalResourceId: cr.PhysicalResourceId.of(props.initialUserEmail) // Update physical id to always fetch the latest version
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE
        })
      })
    }
  }

  public addFrontend (
    frontendUrl: string,
    allowLocalhostSignin: boolean = false
  ): cognito.UserPoolClient {
    const frontendUrls = [frontendUrl]
    if (allowLocalhostSignin) {
      frontendUrls.push('http://localhost:3000')
    }

    const userPoolClient = this.userPool.addClient('FrontendClient', {
      authFlows: {
        userSrp: true
      },
      oAuth: {
        callbackUrls: frontendUrls,
        logoutUrls: frontendUrls
      }
    })

    this.identityPool.addUserPoolAuthentication(
      new UserPoolAuthenticationProvider({
        userPool: this.userPool,
        userPoolClient
      })
    )

    return userPoolClient
  }
}
