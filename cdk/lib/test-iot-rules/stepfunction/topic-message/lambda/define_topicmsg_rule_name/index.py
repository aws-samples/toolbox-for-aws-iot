#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import os

from aws_lambda_powertools import Logger

logger = Logger()

TOOLBOX_IOT_RULE_PREFIX = os.getenv("TOOLBOX_IOT_RULE_PREFIX", "iottoolbox_tmp_rule_")


def get_execution_id(event):
    execution = event["execution"]
    return str(execution).replace("-", "")


def get_rule_name(prefix, infix, event):
    execution_id = get_execution_id(event)
    return f"{prefix}_{infix}_{execution_id}"


def handle_event(event, toolbox_iot_rule_prefix):
    event["getMessageRuleName"] = get_rule_name(
        toolbox_iot_rule_prefix, "getMessage", event
    )
    event["ingestRuleName"] = get_rule_name(toolbox_iot_rule_prefix, "ingest", event)

    input = event.pop("input")
    event["sql"] = input["sql"]
    event["awsIotSqlVersion"] = input["awsIotSqlVersion"]

    return event


def check_env():
    if not TOOLBOX_IOT_RULE_PREFIX:
        raise Exception("TOOLBOX_IOT_RULE_PREFIX environment variable not defined")


@logger.inject_lambda_context
def lambda_handler(event, context):
    logger.info(event)
    check_env()
    return handle_event(event, TOOLBOX_IOT_RULE_PREFIX)
