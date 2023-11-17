/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {SpaceBetween,} from "@cloudscape-design/components";
import TableReplayMessagePanel from "./table-replay-message-panel";


export function ReplayMessageContent() {
  return (
    <SpaceBetween size="l">
      <TableReplayMessagePanel/>
    </SpaceBetween>
  );
}
