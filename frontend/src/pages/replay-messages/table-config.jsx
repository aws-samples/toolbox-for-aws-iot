/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import {Icon, StatusIndicator} from "@cloudscape-design/components";
import {PROGRESS_STATUS} from '../../commons/constants'
import {formatTimestampISO} from "../../commons/functions";


export function getMatchesCountText(count) {
  return count === 1 ? `1 match` : `${count} matches`;
}

function createLabelFunction(columnName) {
  return ({sorted, descending}) => {
    const sortState = sorted
      ? `sorted ${descending ? "descending" : "ascending"}`
      : "not sorted";
    return `${columnName}, ${sortState}.`;
  };
}

export const columnDefinitions = [
  {
    id: "name",
    header: "Recording Name",
    ariaLabel: createLabelFunction("recordingName"),
    cell: (e) => e.recordingName,
    sortingField: "recordingName",
    isRowHeader: true,
  },
  {
    id: "status",
    header: "Status",
    ariaLabel: createLabelFunction("status"),
    cell: (e) => {
      switch (e.status) {
        case PROGRESS_STATUS.PREPARING:
          return <StatusIndicator type={"pending"}>Preparing</StatusIndicator>
        case PROGRESS_STATUS.IN_PROGRESS:
          return <StatusIndicator type={"in-progress"} colorOverride={"green"}>Replaying</StatusIndicator>
        case PROGRESS_STATUS.ABORTED:
          return <StatusIndicator type={"stopped"}>Cancelled</StatusIndicator>
        case PROGRESS_STATUS.FINISHED:
          return <StatusIndicator type={"success"}>Finished</StatusIndicator>
        case PROGRESS_STATUS.FAILED:
          return <StatusIndicator type={"error"}>Failed</StatusIndicator>
        default:
          return <StatusIndicator type={"warning"}>Unknown</StatusIndicator>
      }
    },
    sortingField: "status",
  },
  {
    id: "topic",
    header: "Prefix",
    cell: (e) => e.topicPrefix,
    ariaLabel: createLabelFunction("topic"),

    sortingField: "topicPrefix",
  },
  {
    id: "replayId",
    header: "Start Replay Timestamp",
    ariaLabel: createLabelFunction("replayId"),
    sortingField: "replayId",
    cell: (e) => {
      return formatTimestampISO(e.replayId, false)
    },
    sortingComparator: (a, b) =>
      a.replayId.valueOf() - b.replayId.valueOf()
  },
  {
    id: "recordingId",
    header: "Recording ID",
    ariaLabel: createLabelFunction("id"),
    cell: (e) => e.recordingId,
    sortingField: "recordingId",
    isRowHeader: true,
  }
];

export const paginationLabels = {
  nextPageLabel: "Next page",
  pageLabel: (pageNumber) => `Go to page ${pageNumber}`,
  previousPageLabel: "Previous page",
};

const pageSizePreference = {
  title: "Select page size",
  options: [
    {value: 20, label: "20 resources"},
    {value: 40, label: "40 resources"},
  ],
};

const visibleContentPreference = {
  title: "Select visible content",
  options: [
    {
      label: "Main properties",
      options: columnDefinitions.map(({id, header}) => ({
        id,
        label: header,
      })),
    },
  ],
};
export const collectionPreferencesProps = {
  pageSizePreference,
  visibleContentPreference,
  cancelLabel: "Cancel",
  confirmLabel: "Confirm",
  title: "Preferences",
};
