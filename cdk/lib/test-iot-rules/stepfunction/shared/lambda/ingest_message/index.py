#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import json
from typing import Dict

import boto3
from aws_lambda_powertools import Logger

logger = Logger()

_iot_data_client = boto3.client("iot-data")


def get_rule_name(event):
    return event["ingestRuleName"]


def prepare_request(event, rule_name) -> Dict[str, any]:
    payload = event["message"]
    payload["sfnTaskToken"] = event["taskToken"]

    userProperties = event.get("properties", {}).get("userProperties", [])
    mqttProperties = event.get("properties", {}).get("mqttProperties", {})

    return dict(
        topic=f"$aws/rules/{rule_name}",
        qos=1,
        payload=json.dumps(payload),
        userProperties=userProperties,
        **mqttProperties,
    )


def handle_event(iot_data_client, event):
    input = event.pop("input")
    event = event | input
    try:
        ingest_rule_name = get_rule_name(event)
    except Exception as e:
        logger.error(
            f"Failed to ingest message. Ingest topic missing ('ingestRuleName')",
            extra={"Exception": e},
        )
        return e.__class__.__name__

    try:
        request = prepare_request(event, ingest_rule_name)
        logger.info("Publish message request", extra={"request": request})
        response = iot_data_client.publish(**request)
        logger.info("Publish message response", extra={"response": response})
    except Exception as e:
        logger.error(
            f"Failed to ingest message to $aws/rules/{ingest_rule_name}",
            extra={"Exception": e},
        )
        return e.__class__.__name__

    return


@logger.inject_lambda_context
def lambda_handler(event, context):
    logger.info(event)
    return handle_event(_iot_data_client, event)
