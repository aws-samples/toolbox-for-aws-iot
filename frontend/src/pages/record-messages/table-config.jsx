/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import {Icon, StatusIndicator} from "@cloudscape-design/components";
import {PROGRESS_STATUS} from '../../commons/constants'
import {formatTimestampISO} from '../../commons/functions'

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
    id: "recordingId",
    header: "ID",
    ariaLabel: createLabelFunction("id"),
    cell: (e) => e.recordingId,
    sortingField: "recordingId",
    isRowHeader: true,
  },
  {
    id: "name",
    header: "Name",
    ariaLabel: createLabelFunction("name"),
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
        case PROGRESS_STATUS.IN_PROGRESS:
          return <StatusIndicator type={"in-progress"} colorOverride={"green"}>Recording</StatusIndicator>
        case PROGRESS_STATUS.FINISHED:
          return <StatusIndicator type={"success"}>Finished</StatusIndicator>
        case PROGRESS_STATUS.FAILED:
          return <StatusIndicator type={"error"}>Failed</StatusIndicator>
        case PROGRESS_STATUS.DELETING:
          return <StatusIndicator type={"in-progress"} colorOverride={"red"}>Deleting</StatusIndicator>
        default:
          return <StatusIndicator type={"warning"}>Unknown</StatusIndicator>

      }
    },
    sortingField: "status",
  },
  {
    id: "topic",
    header: "Topic",
    cell: (e) => e.topic,
    ariaLabel: createLabelFunction("topic"),
    sortingField: "topic",
  },
  {
    id: "createdAt",
    header: "Started",
    sortingField: "createdAt",
    ariaLabel: createLabelFunction("createdAt"),
    cell: (e) => {
      return formatTimestampISO(e.createdAt, false)
    },
    sortingComparator: (a, b) =>
      a.createdAt.valueOf() - b.createdAt.valueOf(),
  },
  {
    id: "stoppedAt",
    header: "Stopped",
    sortingField: "stoppedAt",
    ariaLabel: createLabelFunction("stoppedAt"),
    cell: (e) => {
      return formatTimestampISO(e.stoppedAt, false)
    },
    sortingComparator: (a, b) =>
      a.stoppedAt.valueOf() - b.stoppedAt.valueOf(),
  },

  {
    id: "duration",
    header: "Duration",
    sortingField: "duration",
    ariaLabel: createLabelFunction("duration"),
    cell: (e) => {
      if (!e.stoppedAt) return "N/A";

      const startDate = new Date(e.createdAt);
      const stopDate = new Date(e.stoppedAt);
      const duration = (stopDate - startDate) / (1000 * 60);
      return Math.abs(duration).toFixed(2) + " minutes";
    },
    sortingComparator: (a, b) => {
      const durationA = a.stoppedAt - a.createdAt;
      const durationB = b.stoppedAt - b.createdAt;
      return durationA.valueOf() - durationB.valueOf()
    }
  },
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
