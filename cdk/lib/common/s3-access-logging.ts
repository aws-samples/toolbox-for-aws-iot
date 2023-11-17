/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { BucketEncryption } from 'aws-cdk-lib/aws-s3'

export class S3AccessLoggingConstruct extends Construct {
  readonly accessLogsBucket: s3.Bucket

  constructor (scope: Construct, id: string) {
    super(scope, id)
    this.accessLogsBucket = new s3.Bucket(this, 'S3AccessLogs', {
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true
    })
  }
}
