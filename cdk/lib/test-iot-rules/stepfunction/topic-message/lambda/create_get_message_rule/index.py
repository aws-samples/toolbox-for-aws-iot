#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import os
import re
from typing import Optional, Dict

import boto3
from aws_lambda_powertools import Logger

logger = Logger()

_iot_client = boto3.client("iot")
_sfn_client = boto3.client("stepfunctions")
RECEIVE_MESSAGE_LAMBDA_ARN = os.getenv("RECEIVE_MESSAGE_LAMBDA_ARN", None)
PUBLISH_MESSAGE_ROLE_ARN = os.getenv("PUBLISH_MESSAGE_ROLE_ARN", None)
REPUBLISH_ERROR_TOPIC = os.getenv("REPUBLISH_ERROR_TOPIC", None)


class SqlParseException(Exception):
    pass


def parse_input_sql(input_sql):
    # Raise an exception if anything after the FROM clause is not a WHERE clause
    if not re.search(
        r"FROM\s+'[^']+'(?=(?:\s+WHERE.*)|$)", input_sql, flags=re.IGNORECASE
    ):
        raise SqlParseException

    from_str = None
    select_str_exists = False
    if from_str_match := re.search(r"FROM\s+'([^']+)'", input_sql, flags=re.IGNORECASE):
        from_str = from_str_match.group(1)
    if re.search("^SELECT", input_sql, flags=re.IGNORECASE):
        select_str_exists = True

    if not (from_str and select_str_exists):
        raise SqlParseException

    return from_str, select_str_exists


def create_wrapper_sql(input_sql: str, task_token: str) -> Optional[str]:
    from_str, select_str_exists = parse_input_sql(input_sql)

    new_sql = """SELECT {
            'message': *,
            'sfnTaskToken': '##TASKTOKEN##',
            'properties': {
                'userProperties': get_user_properties(),
                'mqttProperties': {
                    'contentType': get_mqtt_property('content_type'),
                    'payloadFormatIndicator': get_mqtt_property('format_indicator'),
                    'responseTopic': get_mqtt_property('response_topic'),
                    'correlationData': get_mqtt_property('correlation_data'),
                }
            }
        }
        FROM '##FROM##'
        """.replace(
        "##TASKTOKEN##", task_token
    ).replace(
        "##FROM##", from_str.strip()
    )
    logger.info("Updated SQL", extra={"new_sql": new_sql})
    return new_sql


def send_sql_exception_failure(sfn_client, task_token: str) -> None:
    snf_response = sfn_client.send_task_failure(
        taskToken=task_token, error="SqlParseException"
    )
    logger.info("SendTaskFailure", extra={"response": snf_response})
    return


def create_topic_rule(
    iot_client,
    rule_name: str,
    sql: str,
    aws_iot_sql_version: str,
    receive_message_lambda_arn: str,
    publish_message_role_arn: str,
    republish_error_topic: str,
) -> Optional[str]:
    try:
        response_lambda_rule = iot_client.create_topic_rule(
            ruleName=rule_name,
            topicRulePayload={
                "sql": sql,
                "description": "temporary IoT rule to forward messages to Lambda",
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
    sfn_client,
    event: Dict[str, any],
    receive_message_lambda_arn: str,
    publish_message_role_arn: str,
    republish_error_topic: str,
) -> Optional[str]:
    input = event.pop("input")
    event = event | input

    aws_iot_sql_version = event["awsIotSqlVersion"]
    task_token = event["taskToken"]
    get_message_rule_name = event["getMessageRuleName"]

    new_sql = create_wrapper_sql(event["sql"], task_token)

    if not new_sql:
        return send_sql_exception_failure(sfn_client, task_token)

    return create_topic_rule(
        iot_client,
        get_message_rule_name,
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
        _sfn_client,
        event,
        RECEIVE_MESSAGE_LAMBDA_ARN,
        PUBLISH_MESSAGE_ROLE_ARN,
        REPUBLISH_ERROR_TOPIC,
    )
