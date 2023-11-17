/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {SpaceBetween,} from "@cloudscape-design/components";
import RecordMessagePanel from "./record-message-panel";
import RecordingTable from "./recording-table";
import {API} from "aws-amplify";
import {
  ENDPOINT_DELETE_RECORD_MESSAGES,
  ENDPOINT_STOP_RECORD_MESSAGES,
  PROGRESS_STATUS,
  TOOLBOX_API
} from "../../commons/constants";

export function RecordMessageContent() {
  const [reloadRecords, setReloadRecords] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  async function stopRecording(recordingId) {
    console.log(recordingId)
    setIsLoading(true)
    await API.post(TOOLBOX_API, ENDPOINT_STOP_RECORD_MESSAGES, {body: {recordingId}})
      .then((data) => {
        setReloadRecords(true)

        if (data?.error) {
          console.log(data.error)
        }

        setIsLoading(false)
      })
      .catch((error) => {
        console.log(error);
      });
  }

  async function deleteRecording(recordingId) {
    setIsLoading(true)
    await API.post(TOOLBOX_API, ENDPOINT_DELETE_RECORD_MESSAGES, {body: {recordingId}})
      .then((data) => {
        setTimeout(() => setReloadRecords(true), 250)

        if (data?.error) {
          console.log(data.error)
        }

        setIsLoading(false)
      })
      .catch((error) => {
        console.log(error);
      });
  }

  return (
    <SpaceBetween size="l">
      <RecordMessagePanel onRecordingStarted={() => setReloadRecords(true)}/>
      <RecordingTable
        reloadRecords={reloadRecords}
        onRecordsLoaded={() => setReloadRecords(false)}
        headerButtons={(selectedItems) => [
          {
            variant: "primary",
            disabled: selectedItems.length !== 1 || selectedItems.some((item) => item.status !== PROGRESS_STATUS.IN_PROGRESS),
            onClick: () => stopRecording(selectedItems[0].recordingId),
            text: "Stop Recording"
          },
          {
            variant: "primary",
            disabled: selectedItems.length === 0 || selectedItems.some((item) => item.status !== PROGRESS_STATUS.FINISHED),
            onClick: () => deleteRecording(selectedItems[0].recordingId),
            text: "Delete Recording"
          },
        ]}
      />
    </SpaceBetween>
  );

}