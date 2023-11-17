/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
  AttributeEditor,
  CodeEditor,
  Container,
  ExpandableSection,
  FormField,
  Header,
  Input,
  Select,
  SpaceBetween,
  Tiles,
} from "@cloudscape-design/components";
import {CODE_EDITOR_I18N_STRINGS} from "../../form-config";
import {MQTTProperties} from "../../commons/constants";
//import { InfoLink } from '../commons/common-components';

const DELIVERY_METHOD = {
  CUSTOM: "custom",
  TOPIC: "topic"
}

export default function MessageTypePanel({
                                           userProperties,
                                           setUserProperties,
                                           mqttProperties,
                                           setMqttProperties,
                                           messageType,
                                           setMessageType,
                                           customMessage,
                                           setCustomMessage,
                                         }) {
  const [deliveryMethod, setDeliveryMethod] = useState(messageType);
  const [ace, setAce] = useState(undefined);

  const [codeEditorLoading, setCodeEditorLoading] = useState(true);
  const [codeEditorValue, setCodeEditorValue] = useState(customMessage);
  const [codeEditorPreferences, setCodeEditorPreferences] = useState(undefined);
  const propertyLimit = 5;

  useEffect(() => {
    async function loadAce() {
      const ace = await import("ace-builds");
      await import("ace-builds/webpack-resolver");
      ace.config.set("useStrictCSP", true);
      return ace;
    }

    loadAce()
      .then((ace) => setAce(ace))
      .finally(() => setCodeEditorLoading(false));
  }, []);

  const onCodeEditorChange = (e) => {
    setCodeEditorValue(e.detail.value);
    setCustomMessage(e.detail.value);
  };

  const onCodeEditorPreferencesChange = (e) => {
    setCodeEditorPreferences(e.detail);
  };

  const mqqtPayloadFormatIndicator = [
    {label: "UTF-8", value: "UTF8_DATA"},
    {label: "Binary", value: "UNSPECIFIED_BYTES"},
  ];

  const defaultOptions = [
    {...MQTTProperties.CONTENT_TYPE, placeholder: "e.g. application/json", value: ""},
    {
      ...MQTTProperties.PAYLOAD_FORMAT_INDICATOR,
      possibleOptions: mqqtPayloadFormatIndicator,
      value: ""
    },
    {...MQTTProperties.RESPONSE_TOPIC, value: ""},
    {...MQTTProperties.CORRELATION_DATA, value: ""},
    {...MQTTProperties.MESSAGE_EXPIRY, value: ""},
  ];


  const [selectOptions, setSelectOptions] = React.useState(defaultOptions);

  const Control = React.memo(
    ({value, index, placeholder, setItems, prop}) => {
      return (
        <Input
          value={value}
          placeholder={placeholder}
          disableBrowserAutocorrect
          onChange={({detail}) => {
            setItems((items) => {
              const updatedItems = [...items];
              updatedItems[index] = {
                ...updatedItems[index],
                [prop]: detail.value,
              };
              return updatedItems;
            });
          }}
        />
      );
    }
  );

  const definitionUserProperties = useMemo(
    () => [
      {
        label: "Key",
        control: ({key = ""}, itemIndex) => (
          <Control
            prop="key"
            value={key}
            index={itemIndex}
            placeholder="Enter key"
            setItems={setUserProperties}
          />
        ),
        errorText: (item) =>
          !item.key ? <span>Key cannot be empty.</span> : null,
      },
      {
        label: "Value",
        control: ({value = ""}, itemIndex) => (
          <Control
            prop="value"
            value={value}
            index={itemIndex}
            placeholder="Enter value"
            setItems={setUserProperties}
          />
        ),
        errorText: (item) =>
          !item.value ? <span>Value cannot be empty.</span> : null,
      },
    ],
    []
  );

  const definitionMQTTProperties = useMemo(
    () => [
      {
        label: "Property type",
        control: (item, itemIndex) => (
          <Select
            selectedOption={item.type}
            prop={"key"}
            options={selectOptions}
            onChange={({detail}) => {
              setMqttProperties((items) => {
                const updatedItems = [...items];
                console.log(updatedItems)
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  "type": detail.selectedOption,
                };
                console.log(updatedItems)
                return updatedItems;
              });
            }}
          />
        ),
        errorText: (item) =>
          !item.type ? <span>Property type cannot be empty.</span> : null,
      },
      {
        label: "Value",
        control: (item, itemIndex) => {
          if (item.type?.possibleOptions) {
            return (
              <Select
                prop="value"
                selectedOption={item.type.possibleOptions.label}
                options={item.type.possibleOptions}
                index={itemIndex}
                onChange={({detail}) => {
                  setMqttProperties((items) => {
                    const updatedItems = [...items];
                    updatedItems[itemIndex] = {
                      ...updatedItems[itemIndex],
                      "value": detail.selectedOption.value,
                    };
                    return updatedItems;
                  });
                }}
              />
            )
          } else {
            return (
              <Control
                prop="value"
                value={item.value}
                index={itemIndex}
                placeholder={item.type?.placeholder}
                setItems={setMqttProperties}
              />
            )
          }
        },
        errorText: (item) =>
          !item.value ? <span>Value cannot be empty.</span> : null,
      },
    ],
    [selectOptions, setMqttProperties]
  );

  const userPropertiesOnAddButtonClick = useCallback(() => {
    setUserProperties((items) => [...items, {}]);
  }, [userProperties, setUserProperties]);

  const userPropertiesOnRemoveButtonClick = useCallback(
    ({detail: {itemIndex}}) => {
      const tmpItems = [...userProperties];
      tmpItems.splice(itemIndex, 1);
      setUserProperties(tmpItems);
    }
  );
  const mqttPropertiesOnAddButtonClick = useCallback(() => {
    setMqttProperties((items) => [...items, {}]);
    if (mqttProperties.length > 0) {
      setSelectOptions(
        defaultOptions.filter(
          (option) =>
            !mqttProperties.some(
              (property) => property.type.key === option.key
            )
        )
      );
    }
  }, [mqttProperties, setMqttProperties, setSelectOptions]);

  const mqttPropertiesOnRemoveButtonClick = useCallback(
    ({detail: {itemIndex}}) => {
      const tmpItems = [...mqttProperties];
      tmpItems.splice(itemIndex, 1);
      setMqttProperties(tmpItems);
      if (tmpItems.length === 0) {
        setSelectOptions(defaultOptions);
      } else {
        setSelectOptions(
          defaultOptions.filter((option) =>
            tmpItems.some((property) => {
              if (property.type?.key) {
                return property.type.key === option.value;
              } else {
                return false;
              }
            })
          )
        );
      }
    }
  );

  const additionalInfo = useMemo(
    () =>
      `You can add ${propertyLimit - mqttProperties.length} more properties.`,
    [mqttProperties.length]
  );

  return (
    <Container
      fitHeight
      header={<Header variant="h2">Define test message for IoT Rule</Header>}
      footer={deliveryMethod === DELIVERY_METHOD.CUSTOM &&
        <ExpandableSection
          headerText="Additional configuration"
          variant="footer"
        >
          <SpaceBetween size="l">
            <FormField
              label="User properties"
              description="Add user properties in the MQTT header."
              stretch={true}
            >
              <AttributeEditor
                items={userProperties}
                definition={definitionUserProperties}
                onAddButtonClick={userPropertiesOnAddButtonClick}
                onRemoveButtonClick={userPropertiesOnRemoveButtonClick}
                addButtonText="Add user property"
                removeButtonText="Remove"
              />
            </FormField>
            <FormField
              label="MQTT 5 properties"
              description="Add MQTT 5 properties by choosing a property type and adding a value."
              stretch={true}
            >
              {((mqttProperties.length > 0 &&
                  mqttProperties.some((item) => !item.type)) ||
                mqttProperties.length === propertyLimit) && (
                <AttributeEditor
                  additionalInfo={additionalInfo}
                  onAddButtonClick={mqttPropertiesOnAddButtonClick}
                  onRemoveButtonClick={mqttPropertiesOnRemoveButtonClick}
                  items={mqttProperties}
                  definition={definitionMQTTProperties}
                  addButtonText="Add MQTT 5 property"
                  removeButtonText="Remove"
                  disableAddButton
                />
              )}
              {(mqttProperties.length === 0 ||
                  !mqttProperties.some((item) => !item.type)) &&
                mqttProperties.length !== propertyLimit && (
                  <AttributeEditor
                    additionalInfo={additionalInfo}
                    onAddButtonClick={mqttPropertiesOnAddButtonClick}
                    onRemoveButtonClick={mqttPropertiesOnRemoveButtonClick}
                    items={mqttProperties}
                    definition={definitionMQTTProperties}
                    addButtonText="Add MQTT 5 property"
                    removeButtonText="Remove"
                  />
                )}
            </FormField>
          </SpaceBetween>
        </ExpandableSection>
      }
    >
      <FormField label="Message Type" stretch={true}>
        <Tiles
          items={[
            {
              value: DELIVERY_METHOD.CUSTOM,
              label: "Custom",
              description: "Create custom message",
            },
            {
              value: DELIVERY_METHOD.TOPIC,
              label: "Topic",
              description:
                "Subscribe to a topic to retrieve first incoming message",
            },
          ]}
          value={deliveryMethod}
          onChange={(e) => {
            setDeliveryMethod(e.detail.value);
            setMessageType(e.detail.value);
          }}
        />
      </FormField>
      {deliveryMethod === DELIVERY_METHOD.CUSTOM && (
        <SpaceBetween size="l">
          <FormField
            label="Create test message"
            description="Create a message to test your SQL statement."
            stretch={true}
          >
            <CodeEditor
              ace={ace}
              value={codeEditorValue}
              language="json"
              onChange={onCodeEditorChange}
              preferences={codeEditorPreferences}
              onPreferencesChange={onCodeEditorPreferencesChange}
              loading={codeEditorLoading}
              i18nStrings={CODE_EDITOR_I18N_STRINGS}
              editorContentHeight={300}
            />
          </FormField>
        </SpaceBetween>
      )}
    </Container>
  );
}
