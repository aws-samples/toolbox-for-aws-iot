#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#  SPDX-License-Identifier: Apache-2.0

from contextlib import nullcontext as does_not_raise

import pytest
from create_get_message_rule.index import (
    parse_input_sql,
    create_wrapper_sql,
    SqlParseException,
)

TEST_ENVIRONMENT = {
    "RECEIVE_MESSAGE_LAMBDA_ARN": "foo",
    "PUBLISH_MESSAGE_ROLE_ARN": "bar",
}


@pytest.mark.parametrize(
    "input_sql, exception_expectation, expected_from_str, expected_select_str_exist",
    [
        ("asd where foo", pytest.raises(SqlParseException), None, False),
        ("SELECT *", pytest.raises(SqlParseException), None, True),
        ("select *", pytest.raises(SqlParseException), None, True),
        ("SELEcT a, b, SUM(d) as x", pytest.raises(SqlParseException), None, True),
        (
            "SELECT a, b, SUM(d) as x WHERE foo = 'bar'",
            pytest.raises(SqlParseException),
            None,
            True,
        ),
        (
            "SELECT a, b, SUM(d) as x      WHERE foo = 'bar'",
            pytest.raises(SqlParseException),
            None,
            True,
        ),
        ("SELECT * WHERE foo = 'bar'", pytest.raises(SqlParseException), None, True),
        ("SELECT * where foo = 'bar'", pytest.raises(SqlParseException), None, True),
        (
            "SELECT abc, def, SUM(D) from 'iot/test' where foo = 'bar', AVG(def) = 5",
            does_not_raise(),
            "iot/test",
            True,
        ),
        ("SELECT * FROM 'iot/test'", does_not_raise(), "iot/test", True),
        (
            "SELECT * FROM 'iot/test' WHERE foo = 'bar' and sdf = 123",
            does_not_raise(),
            "iot/test",
            True,
        ),
    ],
)
def test_parse_input_sql(
    input_sql, exception_expectation, expected_from_str, expected_select_str_exist
):
    with exception_expectation:
        actual_from, actual_select = parse_input_sql(input_sql)
        assert actual_from == expected_from_str
        assert actual_select == expected_select_str_exist


def test_create_wrapper_sql(mocker):
    parse_input_sql_mock = mocker.patch("create_get_message_rule.index.parse_input_sql")
    parse_input_sql_mock.return_value = ("mocked/topic", True)
    expected_result = """SELECT {
        'message': *,
        'sfnTaskToken': 'TASKTOKEN',
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
    FROM 'mocked/topic'
    """
    actual_result = create_wrapper_sql("Doesn't matter", "TASKTOKEN")

    parse_input_sql_mock.assert_called_with("Doesn't matter")

    expected_result_str = "".join([x.strip() for x in expected_result.split("\n")])
    actual_result_str = "".join([x.strip() for x in actual_result.split("\n")])

    assert actual_result_str == expected_result_str
