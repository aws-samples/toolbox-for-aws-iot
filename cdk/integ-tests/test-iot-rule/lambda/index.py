#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import json
import os
import boto3
import time

iot_data_client = boto3.client('iot-data')


def lambda_handler(event, context):
    print(event)
    topic = os.environ.get('TOPIC')
    payload = {
              "name": "John",
              "age": 30,
              "city": "New York",
            }
    while True:
        try:
            response = iot_data_client.publish(
                topic=topic,
                qos=1,
                payload=json.dumps(payload),
                userProperties=[
                {
                    "deviceName": "alpha",
                },
                {
                    "deviceCnt": "45",
                },
                ],
                payloadFormatIndicator='UTF8_DATA',
                contentType='application/json',
                responseTopic='test/msg/response',
                correlationData='test'
            )
        except Exception as e:
            print('failed to ingest message to '+ topic)
            print(e)
            return e.__class__.__name__
        
        time.sleep(1)  # nosemgrep: arbitrary-sleep

    return
 