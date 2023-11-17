#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import json

import boto3
from aws_lambda_powertools import Logger

logger = Logger()

_sfn_client = boto3.client("stepfunctions")


def remove_key_from_message(message, remove_key):
    if isinstance(message, dict):
        for key in list(message.keys()):
            if key == remove_key:
                del message[key]
            else:
                remove_key_from_message(message[key], remove_key)


def handle_event(sfn_client, event):
    task_token = event.pop("sfnTaskToken")
    remove_key_from_message(event, "sfnTaskToken")
    sfn_response = sfn_client.send_task_success(
        taskToken=str(task_token), output=json.dumps(event)
    )
    logger.info("SendTaskSuccess response", extra={"response": sfn_response})
    return


@logger.inject_lambda_context
def lambda_handler(event, context):
    logger.info(event)
    return handle_event(_sfn_client, event)
