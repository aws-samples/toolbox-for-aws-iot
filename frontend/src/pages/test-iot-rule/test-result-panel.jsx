/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {memo} from "react";
import {
  Box,
  Button,
  ColumnLayout,
  Container,
  ExpandableSection,
  FormField,
  Grid,
  Header,
  SpaceBetween,
  Table,
} from "@cloudscape-design/components";
import {MQTTProperties} from "../../commons/constants";


const ValueWithLabel = ({label, children}) => (
  <div>
    <Box variant="awsui-key-label">{label}</Box>
    <div>{children}</div>
  </div>
);

const MqttPropertiesPanel = memo((props) => {
  const returnedMqttProperties = props?.returnedMqttProperties || {};
  const items = Object.values(MQTTProperties).map(({key, label}) => {
    return (<ValueWithLabel key={key} label={label}>{returnedMqttProperties[key] || "-"}</ValueWithLabel>)
  })
  return (
    <SpaceBetween size={"m"}>
      <Box variant={"h4"}>MQTT properties</Box>
      <ColumnLayout columns={3} variant="text-grid">{items}</ColumnLayout>
    </SpaceBetween>
  )
})

const UserPropertiesPanel = memo((props) => {
  const returnedUserProperties = props?.returnedUserProperties || [];
  return (
    <Table
      header={<Box variant="h4">User properties</Box>}
      variant={"embedded"}
      columnDefinitions={[
        {
          id: "key",
          header: "Key",
          cell: item => item.key,
          isRowHeader: true
        },
        {
          id: "value",
          header: "Value",
          cell: item => item.value,
        }
      ]}
      empty={<Box margin={"xs"} textAlign={"center"} color={"inherit"}>No properties</Box>}
      items={returnedUserProperties.flatMap(item => Object.entries(item)).map(([k, v]) => ({key: k, value: v}))}/>
  )
})

export default function ResultRulePanel({
                                          resultInput,
                                          resultOutput,
                                          resultMqttProperties,
                                          resultUserProperties,
                                          isLoading,
                                          handleClick,
                                        }) {
  return (
    <Grid gridDefinition={[{colspan: 2}, {colspan: 10}]}>
      <Container fitHeight>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          {isLoading && (
            <Button loading fullWidth variant="primary">
              Run Test
            </Button>
          )}
          {!isLoading && (
            <Button fullWidth variant="primary" onClick={handleClick}>
              Run Test
            </Button>
          )}
        </div>
      </Container>
      <Container
        header={
          <Header
            variant="h2"
            /*info={
            <InfoLink
              onFollow={() => loadHelpPanelContent(9)}
              ariaLabel={'Information about cache behavior settings.'}
            />
          }*/
          >
            Test result
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Grid gridDefinition={[{colspan: 6}, {colspan: 6}]}>
            <FormField label="Input">
              <pre>{JSON.stringify(resultInput, null, 2)}</pre>
            </FormField>
            <FormField label="Result">
              <pre>{JSON.stringify(resultOutput, null, 2)}</pre>
            </FormField>
          </Grid>
        </SpaceBetween>
        <ExpandableSection headerText="Properties" variant="footer">
          <SpaceBetween size="l">
            <MqttPropertiesPanel returnedMqttProperties={resultMqttProperties}/>
            <UserPropertiesPanel returnedUserProperties={resultUserProperties}/>
          </SpaceBetween>
        </ExpandableSection>
      </Container>
    </Grid>
  );
}
