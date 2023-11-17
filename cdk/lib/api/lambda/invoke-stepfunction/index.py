#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import json
import os
import time
from typing import Dict

import boto3
from aws_lambda_powertools import Logger

logger = Logger()

_sfn_client = boto3.client("stepfunctions")
SFN_CUSTOM_MESSAGE_ARN = os.getenv("SFN_CUSTOM_MESSAGE_ARN", None)
SFN_TOPIC_MESSAGE_ARN = os.getenv("SFN_TOPIC_MESSAGE_ARN", None)

STEP_FUNCTION_ACCEPTED_VALUES = ["SUCCEEDED", "FAILED", "TIMED_OUT", "ABORTED"]


def handle_event(
    event: Dict[str, any],
    sfn_client: any,
    sfn_custom_message_arn: str,
    sfn_topic_message_arn: str,
):
    statemachine_arn = (
        sfn_custom_message_arn if "message" in event else sfn_topic_message_arn
    )
    response_start = sfn_client.start_execution(
        stateMachineArn=statemachine_arn,
        input=json.dumps(event),
    )

    execution_in_progress = True
    output = []

    while execution_in_progress:
        response_describe = sfn_client.describe_execution(
            executionArn=response_start["executionArn"]
        )
        if response_describe["status"] in STEP_FUNCTION_ACCEPTED_VALUES:
            execution_in_progress = False
            output = response_describe["output"]
        time.sleep(0.1)  # nosemgrep: arbitrary-sleep

    return json.loads(output)


def check_env():
    if not SFN_CUSTOM_MESSAGE_ARN:
        raise Exception("SFN_CUSTOM_MESSAGE_ARN environment variable not defined")

    if not SFN_TOPIC_MESSAGE_ARN:
        raise Exception("SFN_TOPIC_MESSAGE_ARN environment variable not defined")


@logger.inject_lambda_context
def lambda_handler(event, context):
    logger.info(event)
    return handle_event(
        event, _sfn_client, SFN_CUSTOM_MESSAGE_ARN, SFN_TOPIC_MESSAGE_ARN
    )
