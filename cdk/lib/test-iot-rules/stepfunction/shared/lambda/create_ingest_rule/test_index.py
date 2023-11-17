#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

from unittest.mock import Mock

import pytest
from create_ingest_rule.index import create_ingest_sql, create_ingest_topic_rule

TEST_ENVIRONMENT = {
    "RECEIVE_MESSAGE_LAMBDA_ARN": "foo",
    "PUBLISH_MESSAGE_ROLE_ARN": "bar",
}


@pytest.mark.parametrize(
    "input_sql,expected_sql",
    [
        ("SELECT *", "SELECT *, sfnTaskToken"),
        ("select *", "SELECT *, sfnTaskToken"),
        ("SELEcT a, b, SUM(d) as x", "SELECT a, b, SUM(d) as x, sfnTaskToken"),
        (
            "SELECT a, b, SUM(d) as x WHERE foo = 'bar'",
            "SELECT a, b, SUM(d) as x, sfnTaskToken WHERE foo = 'bar'",
        ),
        (
            "SELECT a, b, SUM(d) as x      WHERE foo = 'bar'",
            "SELECT a, b, SUM(d) as x, sfnTaskToken WHERE foo = 'bar'",
        ),
        ("SELECT * WHERE foo = 'bar'", "SELECT *, sfnTaskToken WHERE foo = 'bar'"),
        ("SELECT * where foo = 'bar'", "SELECT *, sfnTaskToken WHERE foo = 'bar'"),
        ("SELECT * where foo = 'bar'", "SELECT *, sfnTaskToken WHERE foo = 'bar'"),
        ("SELECT * FROM 'iot/test'", "SELECT *, sfnTaskToken"),
        (
            "SELECT * FROM 'iot/test' WHERE foo = 'bar'",
            "SELECT *, sfnTaskToken WHERE foo = 'bar'",
        ),
    ],
)
def test_create_ingest_sql(input_sql, expected_sql):
    assert create_ingest_sql(input_sql) == expected_sql


def test_create_ingest_topic_rule():
    sfn_client_mock = Mock()
    sfn_client_mock.create_topic_rule = Mock(return_value="Mock response")
    rule_name = "test"
    sql = "SELECT * FROM test"
    aws_iot_sql_version = "2016-03-23"
    receive_message_lambda_arn = "receive-arn"
    publish_message_role_arn = "publish-arn"
    republish_error_topic = "error-topic"

    create_ingest_topic_rule(
        sfn_client_mock,
        rule_name,
        sql,
        aws_iot_sql_version,
        receive_message_lambda_arn,
        publish_message_role_arn,
        republish_error_topic,
    )
    sfn_client_mock.create_topic_rule.assert_called_with(
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
