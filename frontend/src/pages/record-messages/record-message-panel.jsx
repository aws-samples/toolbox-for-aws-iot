/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from "react";
import {Button, Container, FormField, Header, Input, SpaceBetween,} from "@cloudscape-design/components";

import {API} from "aws-amplify";
import {ENDPOINT_START_RECORD_MESSAGES, TOOLBOX_API} from "../../commons/constants";


export default function RecordMessagePanel({onRecordingStarted}) {
  const [topic, setTopic] = React.useState("");
  const [recordingName, setRecordingName] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  async function startRecording() {
    setIsLoading(true)
    await API.post(TOOLBOX_API, ENDPOINT_START_RECORD_MESSAGES, {body: {topic, recordingName}})
      .then((data) => {
        setIsLoading(false);
        onRecordingStarted()

        if (data?.error) {
          console.log(data.error)
        }

      })
      .catch((error) => {
        console.log(error);
        setIsLoading(false);
      });
  }

  return (
    <Container
      header={
        <Header variant="h2">Choose topic for recording messages</Header>
      }
    >
      <SpaceBetween size="l">
        <FormField label={<>Topic</>}>
          <Input
            placeholder="my/+/topic/*"
            value={topic}
            onChange={({detail}) => setTopic(detail.value)}
            disableBrowserAutocorrect
          />
        </FormField>
        <FormField label={<>Name of recording</>}>
          <Input
            placeholder="Enter recording name"
            value={recordingName}
            onChange={({detail}) => setRecordingName(detail.value)}
            disableBrowserAutocorrect
          />
        </FormField>
        <SpaceBetween direction="horizontal" size="l">

          <Button disabled={topic === "" || recordingName === ""} loading={isLoading} variant="primary"
                  onClick={() => startRecording()}>Start Recording</Button>

        </SpaceBetween>
      </SpaceBetween>
    </Container>
  );
}
