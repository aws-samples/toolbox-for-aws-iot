/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {Flashbar, SpaceBetween} from "@cloudscape-design/components";
import MessageTypePanel from "./define-message-panel";
import DefineRulePanel from "./define-rule-panel";
import ResultRulePanel from "./test-result-panel";
import Grid from "@cloudscape-design/components/grid";
import {API} from "aws-amplify";
import {
  ENDPOINT_TEST_RULE_CUSTOM_MESSAGE,
  ENDPOINT_TEST_RULE_TOPIC_MESSAGE,
  TOOLBOX_API,
} from "../../commons/constants";

export function TestRuleContent() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [messageType, setMessageType] = React.useState("custom");
  const [customMessage, setCustomMessage] = React.useState(
    JSON.stringify(
      {
        message: "Hello from Toolbox for AWS IoT",
      },
      null,
      "\t"
    )
  );
  const [sql, setSql] = React.useState(
    "SELECT <Attribute> FROM <Topic Filter> WHERE <Condition>"
  );
  const [awsIotSqlVersion, setAwsIotSqlVersion] = React.useState("2016-03-23");
  const [userProperties, setUserProperties] = React.useState([]);
  const [mqttProperties, setMqttProperties] = React.useState([]);
  const [resultInput, setResultInput] = React.useState({});
  const [resultOutput, setResultOutput] = React.useState({});
  const [resultUserProperties, setResultUserProperties] = React.useState([]);
  const [resultMqttProperties, setResultMqttProperties] = React.useState({});

  const [flashMsg, setFlashMsg] = React.useState([]);

  const handleRuleEvaluationError = (data, messageType) => {
    const flashMsg = {
      header: null,
      type: "error",
      content: null,
      dismissible: true,
      dismissLabel: "Dismiss message",
      onDismiss: () => setFlashMsg([]),
    };

    switch (data.error) {
      case "SqlParseException":
        flashMsg.content = "SQL Parse Error.";
        flashMsg.header = "Failed to test IoT SQL statement";
        break;
      case "States.Timeout":
        if (messageType === "custom") {
          flashMsg.content =
            "Test message not matched by the specified SQL statement";
          flashMsg.header = "No match";
        } else if (data.input) {
          flashMsg.content =
            "The first message received from the topic didn't match the WHERE criteria";
          flashMsg.header = "No match";
        } else {
          flashMsg.content =
            "No messages received matching the criteria for the specified topic in 30 seconds";
          flashMsg.header = "Timeout";
        }
        break;
      default:
        flashMsg.content =
          data.error.message ||
          "Internal Server Error. Please try again later.";
        flashMsg.header = "Server Error";
    }
    setFlashMsg([flashMsg]);
  };

  const handleRunTestClick = async () => {
    setIsLoading(true);
    setFlashMsg([]);

    let path;
    let payload = {
      sql: sql,
      awsIotSqlVersion: awsIotSqlVersion,
    };

    if (messageType === "custom") {
      console.log(mqttProperties);
      path = ENDPOINT_TEST_RULE_CUSTOM_MESSAGE;

      const mqttPropsObj = mqttProperties.reduce(
        (accumulator, currentValue) =>
          Object.assign(accumulator, {
            [currentValue.type.key]: currentValue.value,
          }),
        {}
      )

      if (mqttPropsObj.correlationData) {
        mqttPropsObj.correlationData = window.btoa(mqttPropsObj.correlationData)
      }

      payload = {
        ...payload,
        message: JSON.parse(customMessage),
        userProperties: userProperties.map((property) => ({
          [property.key]: property.value,
        })),
        mqttProperties: mqttPropsObj,
      };
    } else {
      path = ENDPOINT_TEST_RULE_TOPIC_MESSAGE;
    }

    await API.post(TOOLBOX_API, path, {body: payload})
      .then((data) => {
        setIsLoading(false);
        setResultInput(data.input);
        setResultOutput(data.output);
        setResultUserProperties(data.userProperties);

        const mqttProperties = data.mqttProperties
        if (mqttProperties.correlationData) {
          mqttProperties.correlationData = window.atob(mqttProperties.correlationData)
        }

        setResultMqttProperties(mqttProperties);

        if (data.error) {
          handleRuleEvaluationError(data, messageType);
        }
      })
      .catch((error) => {
        console.log(error);
        handleRuleEvaluationError(error, messageType);
        setIsLoading(false);
      });
  };

  return (
    <SpaceBetween size="m">
      <Flashbar items={flashMsg}/>
      <Grid gridDefinition={[{colspan: 6}, {colspan: 6}]}>
        <DefineRulePanel
          awsIotSqlVersion={awsIotSqlVersion}
          sql={sql}
          setSql={setSql}
          setAwsIotSqlVersion={setAwsIotSqlVersion}
        />
        <MessageTypePanel
          userProperties={userProperties}
          setUserProperties={setUserProperties}
          mqttProperties={mqttProperties}
          setMqttProperties={setMqttProperties}
          messageType={messageType}
          setMessageType={setMessageType}
          customMessage={customMessage}
          setCustomMessage={setCustomMessage}
        />
      </Grid>
      <ResultRulePanel
        handleClick={handleRunTestClick}
        isLoading={isLoading}
        resultInput={resultInput}
        resultOutput={resultOutput}
        resultUserProperties={resultUserProperties}
        resultMqttProperties={resultMqttProperties}
      />
    </SpaceBetween>
  );
}
