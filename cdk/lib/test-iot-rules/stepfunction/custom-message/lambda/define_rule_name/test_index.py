#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

import pytest
from define_rule_name.index import get_execution_id, get_ingest_rule_name, handle_event

TEST_ENVIRONMENT = {
    "RECEIVE_MESSAGE_LAMBDA_ARN": "foo",
    "PUBLISH_MESSAGE_ROLE_ARN": "bar",
}


@pytest.mark.parametrize(
    "event,expected_id",
    [
        ({"foo": "bar", "execution": "123"}, "123"),
        ({"foo": "bar", "execution": "123abc_def"}, "123abc_def"),
        ({"foo": "bar", "execution": "123abc-def"}, "123abcdef"),
    ],
)
def test_get_execution_id(event, expected_id):
    assert get_execution_id(event) == expected_id


@pytest.mark.parametrize(
    "event,prefix,expected_name",
    [
        ({"foo": "bar", "execution": "123"}, "test-prefix", "test-prefix_ingest_123"),
        (
            {"foo": "bar", "execution": "123abc_def"},
            "test-prefix",
            "test-prefix_ingest_123abc_def",
        ),
        (
            {"foo": "bar", "execution": "123abc-def"},
            "test-prefix",
            "test-prefix_ingest_123abcdef",
        ),
    ],
)
def test_get_ingest_rule_name(event, prefix, expected_name):
    assert get_ingest_rule_name(event, prefix) == expected_name


def test_handle_event():
    event = {"input": {"foo": "bar", "execution": "exec"}, "hello": "world"}

    expected = {
        "foo": "bar",
        "execution": "exec",
        "hello": "world",
        "ingestRuleName": "prefix_ingest_exec",
    }

    result = handle_event(event, "prefix")

    assert expected == result
