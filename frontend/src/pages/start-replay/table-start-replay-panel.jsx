/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {API} from "aws-amplify";
import {ENDPOINT_START_REPLAY_MESSAGES, PROGRESS_STATUS, TOOLBOX_API,} from "../../commons/constants";
import {Container, Flashbar, FormField, Header, Input, SpaceBetween,} from "@cloudscape-design/components";
import RecordingTable from "../record-messages/recording-table";

export default function TableReplayMessagePanel() {
  const [reloadRecords, setReloadRecords] = React.useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [topicPrefix, setTopicPrefix] = useState("");
  const [flashMsg, setFlashMsg] = React.useState([]);

  async function startReplaying(recordingId) {
    setIsLoading(true);
    setFlashMsg([]);
    await API.post(TOOLBOX_API, ENDPOINT_START_REPLAY_MESSAGES, {
      body: {recordingId: recordingId, topicPrefix: topicPrefix},
    })
      .then((data) => {
        setIsLoading(false);
        console.log(data);

        if (data?.error) {
          console.log(data.error);
        }
        setIsLoading(false);
        navigate("/replay");
      })
      .catch((error) => {
        console.log(error);
        if (error.response?.data?.message) {
          setFlashMsg([{
            header: "Replay failed",
            type: "error",
            content: error.response?.data?.message,
            dismissible: true,
            dismissLabel: "Dismiss message",
            onDismiss: () => setFlashMsg([]),
          }]);
        }
        setIsLoading(false);
      });
  }

  let navigate = useNavigate();
  const goToReplayMessagePage = () => {
    let path = `/replay`;
    navigate(path);
  };
  return (
    <SpaceBetween size="l">
      <Flashbar items={flashMsg}/>
      <Container
        header={
          <Header variant="h2">Choose prefix for replaying messages</Header>
        }
      >
        <FormField label={<>Topic</>}>
          <Input
            placeholder="prefix"
            value={topicPrefix}
            onChange={({detail}) => setTopicPrefix(detail.value)}
            disableBrowserAutocorrect
          />
        </FormField>
      </Container>
      <RecordingTable
        reloadRecords={reloadRecords}
        onRecordsLoaded={() => setReloadRecords(false)}
        footerButtons={(selectedItems) => [
          {
            variant: "secondary",
            onClick: goToReplayMessagePage,
            text: "Cancel"
          },
          {
            variant: "primary",
            disabled: selectedItems.length === 0 || selectedItems.some((item) => item.status !== PROGRESS_STATUS.FINISHED),
            loading: isLoading,
            onClick: () => startReplaying(selectedItems[0].recordingId),
            text: "Start Replaying"
          }
        ]}
      />
    </SpaceBetween>
  );
}
