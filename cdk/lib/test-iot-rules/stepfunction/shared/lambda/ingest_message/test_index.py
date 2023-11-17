#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import json
from contextlib import nullcontext as does_not_raise
from unittest.mock import Mock

import pytest
from ingest_message.index import get_rule_name, prepare_request, handle_event


@pytest.mark.parametrize(
    "event,expected,exception_expectation",
    [
        ({"ingestRuleName": "name"}, "name", does_not_raise()),
        ({"sdf": "name"}, "name", pytest.raises(KeyError)),
    ],
)
def test_get_rule_name(event, expected, exception_expectation):
    with exception_expectation:
        assert get_rule_name(event) == expected


@pytest.mark.parametrize(
    "event,rule_name,expected,exception_expectation",
    [
        (
            {"message": {"my": "msg"}, "taskToken": "token"},
            "rule",
            dict(
                topic=f"$aws/rules/rule",
                qos=1,
                payload=json.dumps({"my": "msg", "sfnTaskToken": "token"}),
                userProperties=[],
            ),
            does_not_raise(),
        ),
        (
            {
                "message": {"my": "msg"},
                "taskToken": "token",
                "properties": {"foo": "bar"},
            },
            "rule",
            dict(
                topic=f"$aws/rules/rule",
                qos=1,
                payload=json.dumps({"my": "msg", "sfnTaskToken": "token"}),
                userProperties=[],
            ),
            does_not_raise(),
        ),
        (
            {
                "message": {"my": "msg"},
                "taskToken": "token",
                "properties": {"userProperties": [{"foo": "bar"}]},
            },
            "rule",
            dict(
                topic=f"$aws/rules/rule",
                qos=1,
                payload=json.dumps({"my": "msg", "sfnTaskToken": "token"}),
                userProperties=[{"foo": "bar"}],
            ),
            does_not_raise(),
        ),
        (
            {
                "message": {"my": "msg"},
                "taskToken": "token",
                "properties": {
                    "userProperties": [{"foo": "bar"}],
                    "mqttProperties": {"testProp": "foo"},
                },
            },
            "rule",
            dict(
                topic=f"$aws/rules/rule",
                qos=1,
                payload=json.dumps({"my": "msg", "sfnTaskToken": "token"}),
                userProperties=[{"foo": "bar"}],
                testProp="foo",
            ),
            does_not_raise(),
        ),
        (
            {"message": {"my": "msg"}},
            "rule",
            dict(
                topic=f"$aws/rules/rule",
                qos=1,
                payload=json.dumps({"my": "msg", "sfnTaskToken": "token"}),
                userProperties=[],
            ),
            pytest.raises(KeyError),
        ),
        (
            {"foo": {"my": "msg"}},
            "rule",
            dict(
                topic=f"$aws/rules/rule",
                qos=1,
                payload=json.dumps({"my": "msg", "sfnTaskToken": "token"}),
                userProperties=[],
            ),
            pytest.raises(KeyError),
        ),
    ],
)
def test_prepare_request(event, rule_name, expected, exception_expectation):
    with exception_expectation:
        assert prepare_request(event, rule_name) == expected


def test_handle_event(mocker):
    prep_request_return = {"hello": "world"}

    get_rule = mocker.patch("ingest_message.index.get_rule_name")
    get_rule.return_value = "rule"
    prep_request = mocker.patch("ingest_message.index.prepare_request")
    prep_request.return_value = prep_request_return
    iot_client = Mock()
    iot_client.publish = Mock(return_value="okay")
    event = {
        "foo": "bar",
        "sfnTaskToken": "token",
        "input": {"n": "n", "sfnTaskToken": "nestedToken"},
    }
    expected_event = {
        "foo": "bar",
        "sfnTaskToken": "token",
        "n": "n",
        "sfnTaskToken": "nestedToken",
    }

    handle_event(iot_client, event)

    get_rule.assert_called_with(expected_event)
    prep_request.assert_called_with(expected_event, get_rule.return_value)
    iot_client.publish.assert_called_with(**prep_request_return)
