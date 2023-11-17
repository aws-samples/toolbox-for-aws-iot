#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import boto3
from aws_lambda_powertools import Logger

logger = Logger()

iot_client = boto3.client("iot")


def handle_event(event):
    response = {}

    result = event.get("result", None)
    create_ingest_rule_output = event.get("createIngestRuleOutput", {})
    if create_ingest_rule_output:
        error_msg = create_ingest_rule_output.get("Message", None)
        error_code = create_ingest_rule_output.get("Code", None)

        response = {"output": None, "error": f"{error_code}:  {error_msg}"}

    elif result:
        response = {"output": result, "error": None}
    elif "error" in event:
        response = {
            "output": None,
            "error": event["error"].get("Error", "Unknown error"),
        }
    else:
        if "createMessageRuleOutput" in event:
            response = {"output": None, "error": None}
        else:
            response = {"output": None, "error": "Something went wrong"}
        response["input"] = None

    # add data from input message from topic to output
    if "createMessageRuleOutput" in event:
        create_msg_rule_output = event["createMessageRuleOutput"]
        response["input"] = create_msg_rule_output.get("message", None)
        response["userProperties"] = create_msg_rule_output.get("properties", {}).get(
            "userProperties", []
        )
        response["mqttProperties"] = create_msg_rule_output.get("properties", {}).get(
            "mqttProperties", {}
        )
    elif "message" in event or "userProperties" in event or "mqttProperties" in event:
        response["input"] = event.get("message", None)
        response["userProperties"] = event.get("userProperties", [])
        response["mqttProperties"] = event.get("mqttProperties", {})

    # delete all rules
    for r in ["ingestRuleName", "getMessageRuleName"]:
        if r in event:
            try:
                iot_client.delete_topic_rule(ruleName=event[r])
            except Exception as e:
                logger.error(
                    f"Failed to delete rule {event[r]}", extra={"exception": e}
                )

    return response


@logger.inject_lambda_context
def lambda_handler(event, context):
    logger.info(event)
    return handle_event(event)
