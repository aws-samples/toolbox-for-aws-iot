#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import os
import re
from typing import Optional, Dict

import boto3
from aws_lambda_powertools import Logger

logger = Logger()

_iot_client = boto3.client("iot")

RECEIVE_MESSAGE_LAMBDA_ARN = os.getenv("RECEIVE_MESSAGE_LAMBDA_ARN", None)
PUBLISH_MESSAGE_ROLE_ARN = os.getenv("PUBLISH_MESSAGE_ROLE_ARN", None)
REPUBLISH_ERROR_TOPIC = os.getenv("REPUBLISH_ERROR_TOPIC", None)


class SqlParseException(Exception):
    pass


def create_ingest_sql(input_sql: str) -> Optional[str]:
    where_str = None
    select_str = None
    if re.search("WHERE", input_sql, flags=re.IGNORECASE):
        where_str = re.split("WHERE", input_sql, flags=re.IGNORECASE)[-1]

    if re.search("^SELECT", input_sql, flags=re.IGNORECASE):
        if where_str:
            select_str = re.split(
                "^SELECT",
                re.split("WHERE", input_sql, flags=re.IGNORECASE)[0],
                flags=re.IGNORECASE,
            )[-1]
        else:
            select_str = re.split(
                "^SELECT",
                input_sql,
                flags=re.IGNORECASE,
            )[-1]

    if select_str and re.search("FROM", select_str, flags=re.IGNORECASE):
        select_str = re.split(
            "^SELECT",
            re.split("FROM", select_str, flags=re.IGNORECASE)[0],
            flags=re.IGNORECASE,
        )[-1]

    if select_str and where_str:
        new_sql = """SELECT {0}, sfnTaskToken WHERE {1}""".format(
            select_str.strip(), where_str.strip()
        )
    elif select_str:
        new_sql = """SELECT {0}, sfnTaskToken""".format(select_str.strip())
    else:
        new_sql = ""

    logger.info("Updated SQL", extra={"new_sql": new_sql})

    return new_sql


def create_ingest_topic_rule(
    iot_client,
    rule_name: str,
    sql: str,
    aws_iot_sql_version: str,
    receive_message_lambda_arn: str,
    publish_message_role_arn: str,
    republish_error_topic: str,
):
    try:
        response_lambda_rule = iot_client.create_topic_rule(
            ruleName=rule_name,
            topicRulePayload={
                "sql": sql,
                "description": "temporary IoT rule to forward messages to ingest lambda",
                "actions": [
                    {
                        "lambda": {"functionArn": receive_message_lambda_arn},
                    },
                ],
                "ruleDisabled": False,
                "awsIotSqlVersion": aws_iot_sql_version,
                "errorAction": {
                    "republish": {
                        "roleArn": publish_message_role_arn,
                        "topic": republish_error_topic,
                        "qos": 1,
                    }
                },
            },
        )
        logger.info(
            "CreateTopicRule Response", extra={"response": response_lambda_rule}
        )
        return
    except Exception as e:
        logger.error(f"failed creating {rule_name}", extra={"Exception": e})
        if e.__class__.__name__ == "SqlParseException":
            raise SqlParseException
        raise e


def handle_event(
    iot_client,
    event: Dict[str, any],
    receive_message_lambda_arn: str,
    publish_message_role_arn: str,
    republish_error_topic: str,
) -> Optional[str]:
    if "input" in event:
        input = event.pop("input")
        event = event | input
    sql = event["sql"]
    aws_iot_sql_version = event["awsIotSqlVersion"]
    ingest_rule_name = event["ingestRuleName"]

    new_sql = create_ingest_sql(sql)
    return create_ingest_topic_rule(
        iot_client,
        ingest_rule_name,
        new_sql,
        aws_iot_sql_version,
        receive_message_lambda_arn,
        publish_message_role_arn,
        republish_error_topic,
    )


def check_env():
    if not RECEIVE_MESSAGE_LAMBDA_ARN:
        raise Exception("RECEIVE_MESSAGE_LAMBDA_ARN environment variable not defined")

    if not PUBLISH_MESSAGE_ROLE_ARN:
        raise Exception("PUBLISH_MESSAGE_ROLE_ARN environment variable not defined")

    if not REPUBLISH_ERROR_TOPIC:
        raise Exception("REPUBLISH_ERROR_TOPIC environment variable not defined")


@logger.inject_lambda_context
def lambda_handler(event, context):
    check_env()
    logger.info(event)

    return handle_event(
        _iot_client,
        event,
        RECEIVE_MESSAGE_LAMBDA_ARN,
        PUBLISH_MESSAGE_ROLE_ARN,
        REPUBLISH_ERROR_TOPIC,
    )
