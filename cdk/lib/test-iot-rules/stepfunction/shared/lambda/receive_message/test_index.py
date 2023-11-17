#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import json
from unittest.mock import Mock

import pytest
from receive_message.index import remove_key_from_message, handle_event

TEST_ENVIRONMENT = {
    "RECEIVE_MESSAGE_LAMBDA_ARN": "foo",
    "PUBLISH_MESSAGE_ROLE_ARN": "bar",
}


@pytest.mark.parametrize(
    "remove_key,input_dict,expected_dict",
    [
        ("sfnTaskToken", {"foo": "bar", "sfnTaskToken": "token"}, {"foo": "bar"}),
        (
            "sfnTaskToken",
            {"foo": "bar", "nested1": {"sfnTaskToken": "token"}},
            {"foo": "bar", "nested1": {}},
        ),
        (
            "sfnTaskToken",
            {
                "foo": "bar",
                "nested1": {"nestedFoo": "nestedBar", "sfnTaskToken": "token"},
            },
            {
                "foo": "bar",
                "nested1": {
                    "nestedFoo": "nestedBar",
                },
            },
        ),
        (
            "sfnTaskToken",
            {
                "foo": "bar",
                "nested1": {
                    "nestedFoo": "nestedBar",
                    "nested2": {"sfnTaskToken": "token"},
                },
            },
            {"foo": "bar", "nested1": {"nestedFoo": "nestedBar", "nested2": {}}},
        ),
    ],
)
def test_remove_key_from_message(remove_key, input_dict, expected_dict):
    remove_key_from_message(input_dict, remove_key)
    assert input_dict == expected_dict


def test_handle_event():
    sfn_client = Mock()
    sfn_client.send_task_success = Mock(return_value="Okay")
    event = {
        "foo": "bar",
        "sfnTaskToken": "token",
        "nested": {"n": "n", "sfnTaskToken": "nestedToken"},
    }
    expectedOutpu = json.dumps({"foo": "bar", "nested": {"n": "n"}})

    handle_event(sfn_client, event)
    sfn_client.send_task_success.assert_called_with(
        taskToken="token", output=expectedOutpu
    )
